"""Format Java sources with the same pinned tool locally and in CI."""

import argparse
import hashlib
import os
from pathlib import Path
import subprocess
import urllib.request

VERSION = "1.37.0"
SHA256 = "834b2a0c38cb774953322a84b5ca3f2f40dd3156650b3cd44d3b744345962f7a"
ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--java-home", default=os.environ.get("JAVA_HOME"))
    args = parser.parse_args()
    jar = ROOT / "outputs" / "tools" / f"google-java-format-{VERSION}-all-deps.jar"
    jar.parent.mkdir(parents=True, exist_ok=True)
    if not jar.exists():
        url = f"https://github.com/google/google-java-format/releases/download/v{VERSION}/{jar.name}"
        with urllib.request.urlopen(url, timeout=30) as response:
            content = response.read()
        if hashlib.sha256(content).hexdigest() != SHA256:
            raise RuntimeError("Formatter download failed checksum verification")
        jar.write_bytes(content)
    if hashlib.sha256(jar.read_bytes()).hexdigest() != SHA256:
        raise RuntimeError("Cached formatter failed checksum verification")
    java = str(Path(args.java_home) / "bin" / ("java.exe" if os.name == "nt" else "java")) if args.java_home else "java"
    sources = sorted((ROOT / "backend" / "src").rglob("*.java"))
    options = ["--aosp", "--dry-run", "--set-exit-if-changed"] if args.check else ["--aosp", "--replace"]
    failed = False
    for start in range(0, len(sources), 32):
        result = subprocess.run([java, "-jar", str(jar), *options, *map(str, sources[start:start + 32])])
        failed = failed or result.returncode != 0
    if failed:
        raise SystemExit(1)
    print(f"Java formatting {'checked' if args.check else 'applied'}: {len(sources)} files")


if __name__ == "__main__":
    main()
