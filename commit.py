#!/usr/bin/env python3

import os
import subprocess
import sys
import json
import urllib.parse
from datetime import datetime

def main():
    try:
        message = input("Enter commit message: ")
        tested = input("Was the build thoroughly tested? (y/n): ").strip().lower()
        deployed = input("Is it deployed? (y/n): ").strip().lower()
        version_change = input("Is this a Major, Intermediate, or Minor version change? (major/intermediate/minor - leave blank to skip): ").strip().lower()
    except KeyboardInterrupt:
        print("\nAborted.")
        sys.exit(1)

    is_tested = tested == 'y'
    is_deployed = deployed == 'y'

    test_color = "brightgreen" if is_tested else "red"
    test_text = "Yes" if is_tested else "No"
    
    deploy_color = "brightgreen" if is_deployed else "red"
    deploy_text = "Yes" if is_deployed else "No"

    # Read version
    version = "Unknown"
    manifest_data = {}
    try:
        with open("manifest.json", "r") as f:
            manifest_data = json.load(f)
            version = manifest_data.get("version", "Unknown")
    except Exception as e:
        print(f"Failed to read version from manifest.json: {e}")

    new_version = version
    if version != "Unknown" and version_change in ['major', 'intermediate', 'minor']:
        parts = version.split('.')
        try:
            if len(parts) == 3:
                major = int(parts[0])
                minor_ver = int(parts[1])
                patch = int(parts[2])
                
                if version_change == 'major':
                    major += 1
                    minor_ver = 0
                    patch = 0
                elif version_change == 'intermediate':
                    minor_ver += 1
                    patch = 0
                elif version_change == 'minor':
                    patch += 1
                    
                new_version = f"{major}.{minor_ver}.{patch}"
        except ValueError:
            print("Warning: version format invalid. Could not increment.")

    # Get git status and stats
    try:
        git_status = subprocess.check_output(["git", "status", "-s"], text=True).strip()
        git_stats = subprocess.check_output(["git", "diff", "HEAD", "--stat"], text=True).strip()
    except Exception:
        git_status = "Error getting status"
        git_stats = ""

    print("\n--- Summary ---")
    print(f"Commit Message: {message}")
    print(f"Tested: {test_text}")
    print(f"Deployed: {deploy_text}")
    if new_version != version:
        print(f"Version Change: {version} -> {new_version}")
    else:
        print(f"Version: {version} (No change)")
    
    print("\nChanges:")
    if git_status:
        print(git_status)
    else:
        print("No changes staged/unstaged.")
        
    if git_stats:
        print(f"\nStats:\n{git_stats}")

    try:
        confirm = input("\nDoes everything seem correct? (y/n): ").strip().lower()
        if confirm != 'y':
            print("Aborted.")
            sys.exit(0)
    except KeyboardInterrupt:
        print("\nAborted.")
        sys.exit(1)

    if new_version != version:
        manifest_data["version"] = new_version
        try:
            with open("manifest.json", "w") as f:
                json.dump(manifest_data, f, indent=2)
                f.write("\n")
        except Exception as e:
            print(f"Failed to update manifest.json: {e}")
            sys.exit(1)
        version = new_version

    version_safe = urllib.parse.quote(version).replace("-", "--")
    date_safe = urllib.parse.quote(datetime.now().strftime("%d %b %Y")).replace("-", "--")

    # Get git username
    try:
        git_username = subprocess.check_output(["git", "config", "user.name"], text=True).strip()
    except Exception:
        git_username = "Unknown"
    username_safe = urllib.parse.quote(git_username).replace("-", "--")

    # Shields.io badges
    badge_version = f"![Version](https://img.shields.io/badge/Version-v{version_safe}-brightgreen?style=for-the-badge)"
    badge_date = f"![Date](https://img.shields.io/badge/Date-{date_safe}-blue?style=for-the-badge)"
    badge_user = f"![Committed By](https://img.shields.io/badge/Committed%20By-{username_safe}-blue?style=for-the-badge)"
    badge_test = f"![Tested](https://img.shields.io/badge/Tested-{test_text}-{test_color}?style=for-the-badge)"
    badge_deploy = f"![Deployed](https://img.shields.io/badge/Deployed-{deploy_text}-{deploy_color}?style=for-the-badge)"

    badges_line = f"{badge_version} {badge_date} {badge_user} {badge_test} {badge_deploy}\n"

    # Update README.md
    readme_path = "README.md"
    try:
        with open(readme_path, "r") as f:
            lines = f.readlines()
        
        if len(lines) > 1:
            if "img.shields.io" in lines[1]:
                lines[1] = badges_line
            else:
                lines.insert(1, badges_line)
        else:
            lines.append("\n" + badges_line)
            
        with open(readme_path, "w") as f:
            f.writelines(lines)
            
        print("Updated README.md with badges.")
    except Exception as e:
        print(f"Error updating README.md: {e}")

    # Build final commit message
    final_message = f"{message}"

    # Git commands
    try:
        print("Staging all changes...")
        subprocess.run(["git", "add", "."], check=True)
        
        print(f"Committing with message: {final_message}")
        subprocess.run(["git", "commit", "-m", final_message], check=True)
        
        print("Pushing changes...")
        subprocess.run(["git", "push"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Git command failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
