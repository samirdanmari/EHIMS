# Desk-Depot

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.27.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Packaging

Build the macOS installer on macOS and the Windows installer on Windows. Native
modules such as `better-sqlite3` are rebuilt for the target Electron version
during packaging.

```bash
npm run electron:build:mac
npm run electron:build:win
```

The installers are written to `release/`. The default macOS command creates
both Apple Silicon and Intel DMGs. To create only one architecture, use
`npm run electron:build:mac:arm64` or `npm run electron:build:mac:x64`.

The Windows command creates an NSIS installer. A portable Windows executable
is also available with `npm run electron:build:win:portable`. Run Windows
packaging on Windows, or install Wine before packaging on macOS/Linux.

For public distribution, sign and notarize the macOS build with an Apple
Developer ID certificate, and sign the Windows installer with an Authenticode
certificate. Unsigned builds are suitable for internal testing but will show
platform security warnings.

On the first launch of a new packaged build, the SQLite database and its WAL
files are removed before migrations and default seeding run. This leaves the
default seeded login (`admin` / `admin123`) and default application seed data.
Development runs do not perform this reset. The Windows uninstaller also
removes the app's user data, so a later reinstall starts clean.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
