# Contributing to Better-YouTube

First off, thank you for considering contributing to Better-YouTube! It’s people like you who make the web a better place for everyone.

By participating in this project, you agree to abide by its terms and maintain a respectful community environment.

## How Can I Contribute?

### Reporting Bugs
* **Check the Issues tab** to see if the bug has already been reported.
* If not, **open a new issue**. Include:
    * A clear, descriptive title.
    * Steps to reproduce the bug.
    * What you expected to happen vs. what actually happened.
    * Screenshots (if applicable).
    * Your browser and extension version.

### Suggesting Enhancements
We are always looking for ways to make YouTube better!
* Open an issue with the tag `enhancement`.
* Describe the feature and why it would be useful.

### Pull Requests
Ready to contribute code? Awesome!
1. **Fork** the repository.
2. **Clone** your fork locally.
3. **Create a branch** for your fix or feature (e.g., `git checkout -b feat/darker-dark-mode`).
4. **Make your changes** and commit them with clear messages.
5. **Push** to your fork and **submit a Pull Request**.

---

## Development Guidelines

To keep the codebase clean and maintainable, please follow these simple rules:

* **Keep it Modular:** Try to keep new features independent so they don't break existing ones.
* **Document Your Code:** Add comments to explain complex logic.
* **Respect Privacy:** Better-YouTube should never collect user data. Any feature that requires external communication must be clearly disclosed.

## 🛠️ Debug Mode & Diagnostics

If you need to reproduce an error or backup your settings, use the built-in diagnostic tools:

1.  Open the extension popup.
2.  **Activation**: Click on the **"Better YouTube"** title at the top **5 times** in quick succession.
3.  A **Debug** tab will appear.
4.  Use **Export State** to generate a JSON file of your current configuration.
5.  Use **Import State** to load a JSON configuration (handy for debugging user-reported issues).
6.  **Reset to Defaults** will wipe all local storage for the extension.

> [!NOTE]
> When reporting bugs, attaching an exported state JSON is extremely helpful for maintainers.

## Development Notes

## Licensing

By contributing to **Better-YouTube**, you agree that your contributions will be licensed under the project's [MIT License](LICENSE). 

Because we use the MIT license, your code will remain open and permissive, allowing for the widest possible use and collaboration within the community.

---

*Questions? Feel free to reach out via the Issues tab!*