"""Validate the checked-in contract and fixtures. No backend/network required."""
import copy
import json
import re
import warnings
from pathlib import Path
warnings.filterwarnings('ignore', category=DeprecationWarning)
from jsonschema import RefResolver
from openapi_schema_validator import OAS30Validator
from openapi_spec_validator import validate_spec

ROOT = Path(__file__).resolve().parent
spec = json.loads((ROOT / 'openapi.json').read_text(encoding='utf-8'))
validate_spec(spec)
resolver = RefResolver.from_schema(spec)
count = 0

def resolve(value):
    while isinstance(value, dict) and '$ref' in value:
        target = value['$ref']
        assert target.startswith('#/'), f'External reference not supported: {target}'
        value = spec
        for part in target[2:].split('/'):
            value = value[part.replace('~1', '/').replace('~0', '~')]
    return value

def check(schema, value, label):
    global count
    errors = sorted(OAS30Validator(schema, resolver=resolver,
        format_checker=OAS30Validator.FORMAT_CHECKER).iter_errors(value), key=lambda e: str(e.path))
    assert not errors, label + ': ' + '; '.join(str(e) for e in errors[:3])
    count += 1

def walk(node, location='$'):
    if isinstance(node, dict):
        if '$ref' in node:
            resolve(node)
        for key, value in node.items():
            walk(value, location + '.' + key)
    elif isinstance(node, list):
        for i, value in enumerate(node):
            walk(value, f'{location}[{i}]')

walk(spec)
assert re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+', spec['info']['version'])
assert spec['info']['version'] in (ROOT / 'CHANGELOG.md').read_text(encoding='utf-8')
assert spec['security'] == [{'bearerAuth': []}]
for name, schema in spec['components']['schemas'].items():
    OAS30Validator.check_schema(schema)
    if 'example' in schema:
        check(schema, schema['example'], 'schema ' + name)

def check_content(content, label):
    for mime, media in content.items():
        schema = media['schema']
        if schema.get('format') == 'binary':
            continue
        examples = media.get('examples', {})
        assert examples, 'Missing examples: ' + label + ' ' + mime
        for name, example in examples.items():
            check(schema, resolve(example)['value'], label + ' example ' + name)

ids = set()
for path, path_item in spec['paths'].items():
    for method, operation in path_item.items():
        assert operation['operationId'] not in ids
        ids.add(operation['operationId'])
        assert operation.get('x-permission'), path
        declared = [p['name'] for p in operation.get('parameters', []) if p['in'] == 'path']
        assert set(declared) == set(re.findall(r'{([^}]+)}', path))
        for p in operation.get('parameters', []):
            if 'example' in p['schema']:
                check(p['schema'], p['schema']['example'], path + ' param ' + p['name'])
        if 'requestBody' in operation:
            content = operation['requestBody']['content']
            if 'multipart/form-data' not in content:
                check_content(content, method + ' ' + path + ' request')
        for status, response in operation['responses'].items():
            response = resolve(response)
            assert 'X-Request-Id' in response.get('headers', {})
            if status == '204':
                assert 'content' not in response
            if 'content' in response:
                check_content(response['content'], method + ' ' + path + ' ' + status)

for name, event in spec['x-realtime']['events'].items():
    check(event['schema'], event['example'], 'event ' + name)
    assert event['example']['type'] == name
check(spec['x-realtime']['errors']['schema'], spec['x-realtime']['errors']['example'], 'STOMP ERROR')
check(spec['x-push']['schema'], spec['x-push']['example'], 'FCM')
assert all(isinstance(v, str) for v in spec['x-push']['example'].values())

# Cross-field sanity for canonical fixtures, beyond plain OpenAPI validation.
def success(path, method='get', status='200'):
    return spec['paths'][path][method]['responses'][status]['content']['application/json']['examples']['success']['value']['data']
trip = success('/trips/{tripId}')
itinerary = success('/trips/{tripId}/itinerary')
assert trip['id'] == itinerary['tripId']
assert len(itinerary['days']) == 2
assert [d['dayNumber'] for d in itinerary['days']] == [1, 2]
for day in itinerary['days']:
    for pos, item in enumerate(day['items']):
        assert item['position'] == pos
        assert item['startTime'] < item['endTime']
        assert (item['costSource'] == 'UNKNOWN') == (item['estimatedCostVnd'] is None)
        assert item['kind'] != 'NOTE' or (item['placeId'] is None and item['customTitle'])
request = success('/friend-requests/{requestId}/accept', 'post')
assert request['sender']['id'] != request['recipient']['id']
assert request['status'] == 'ACCEPTED' and request['resolvedAt']
chat = success('/trips/{tripId}/messages', 'post')
assert chat['kind'] == 'TEXT' and chat['media'] is None

# Ensure validation really rejects representative wire regressions.
negative = [
    ('CreateTrip', {'title':'Test','cityCode':'DANANG','startDate':'2026-12-01','endDate':'2026-12-02','budgetVnd':5000000}),
    ('SendMessage', {'clientMessageId':'00000000-0000-4000-8000-000000000060','kind':'TEXT','body':'   '}),
    ('TripSettingsUpdate', {}),
    ('ProfileUpdate', {'role':'OWNER'}),
    ('LocalTime', '25:00'),
    ('UInt64String', '01'),
]
for name, value in negative:
    v = OAS30Validator({'$ref':'#/components/schemas/'+name}, resolver=resolver)
    assert list(v.iter_errors(value)), 'Invalid fixture accepted: ' + name
print(f'PASS: OpenAPI 3.0.3; {len(ids)} operations; {len(spec["components"]["schemas"])} schemas; {count} examples/parameters; {len(negative)} negative checks; fixture invariants.')
