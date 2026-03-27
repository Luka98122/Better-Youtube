#!/usr/bin/env python3

import os
import subprocess
import sys

def main():
    try:
        message = input("Enter commit message: ")
        tested = input("Was the build thoroughly tested? (y/n): ").strip().lower()
        deployed = input("Is it deployed? (y/n): ").strip().lower()
    except KeyboardInterrupt:
        print("\nAborted.")
        sys.exit(1)

    is_tested = tested == 'y'
    is_deployed = deployed == 'y'

    test_color = "brightgreen" if is_tested else "red"
    test_text = "Yes" if is_tested else "No"
    
    deploy_color = "brightgreen" if is_deployed else "red"
    deploy_text = "Yes" if is_deployed else "No"

    # shields.io badges
    badge_test = f"![Tested](https://img.shields.io/badge/Tested-{test_text}-{test_color}?style=for-the-badge)"
    badge_deploy = f"![Deployed](https://img.shields.io/badge/Deployed-{deploy_text}-{deploy_color}?style=for-the-badge)"

    badges_line = f"{badge_test} {badge_deploy}\n"

    # Update readme.md
    readme_path = "readme.md"
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
            
        print("Updated readme.md with badges.")
    except Exception as e:
        print(f"Error updating readme.md: {e}")

    # Build final commit message
    final_message = f"{message} | Tested: {'yes' if is_tested else 'no'} | Deployed: {'yes' if is_deployed else 'no'}"

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
