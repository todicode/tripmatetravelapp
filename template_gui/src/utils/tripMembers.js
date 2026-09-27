export function normalizeMember(member) {
  if (typeof member === 'string') member = { name: member };
  const name = String(member?.name || member?.fullName || '').trim();
  if (!name) throw new Error('Missing member name');
  return { ...member, name, id: member.id || `member_${String(member.phone || name).trim().toLocaleLowerCase('vi-VN')}` };
}
export function sameMember(a, b) {
  const phone = value => String(value || '').replace(/\D/g, '');
  return (!!a.id && a.id === b.id) || a.name.trim().toLocaleLowerCase('vi-VN') === b.name.trim().toLocaleLowerCase('vi-VN') ||
    (!!phone(a.phone) && phone(a.phone) === phone(b.phone));
}
export function uniqueMembers(members) {
  return members.map(normalizeMember).reduce((result, member) => result.some(existing => sameMember(existing, member)) ? result : [...result, member], []);
}
