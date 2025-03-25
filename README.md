# PowerSuiteApp

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.12.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Taiga UI v4 Migration Notes

Taiga UI version 4 introduces significant changes from v3, including:

1. Use of standalone components
2. Removal of Module suffixes
3. Different import paths
4. Additional peer dependencies

### Required Dependencies

For Taiga UI v4 to work properly, make sure these dependencies are installed:

```bash
# Core dependencies
npm install @taiga-ui/cdk @taiga-ui/core @taiga-ui/kit @taiga-ui/icons @taiga-ui/styles

# Required peer dependencies
npm install @taiga-ui/polymorpheus @taiga-ui/event-plugins @taiga-ui/i18n
npm install @ng-web-apis/common @ng-web-apis/resize-observer @ng-web-apis/platform @ng-web-apis/screen-orientation
```

### Using Taiga UI v4 Components

In Angular 18, you use the standalone components approach:

```typescript
// In your component's imports array
imports: [
  TuiRoot,
  TuiButton,
  TuiDataList,
  TuiSvg,
  // other Taiga UI components
]
```

### Migration Command

To automatically migrate from v3 to v4, use:

```bash
ng update @taiga-ui/cdk
```

This will update your imports and component usage patterns.

### Common Issues

1. Missing peer dependencies
2. Incorrect import paths
3. Component name changes (removed 'Module' suffix)

For a more comprehensive guide, see the [official migration guide](https://taiga-ui.dev/migration-guide).
