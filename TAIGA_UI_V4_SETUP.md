# Taiga UI v4 Integration in Angular 18

This document summarizes the work done to integrate Taiga UI v4 with an Angular 18 application.

## Required Dependencies

We've installed the following dependencies for Taiga UI v4:

```bash
# Core Taiga UI packages
npm install @taiga-ui/cdk @taiga-ui/core @taiga-ui/kit @taiga-ui/icons @taiga-ui/styles

# Required peer dependencies
npm install @taiga-ui/polymorpheus @taiga-ui/event-plugins @taiga-ui/i18n
npm install @ng-web-apis/common @ng-web-apis/mutation-observer @ng-web-apis/resize-observer @ng-web-apis/platform @ng-web-apis/screen-orientation
```

## Angular Integration Approach

We've tried several approaches to integrate Taiga UI v4 with Angular 18:

1. **Use of Standalone Components**: Taiga UI v4 is designed to work with Angular's standalone component architecture.

2. **NO_ERRORS_SCHEMA Approach**: Due to some import issues, we're temporarily using `NO_ERRORS_SCHEMA` to allow unknown elements in templates:
   ```typescript
   @NgModule({
     schemas: [NO_ERRORS_SCHEMA],
     // ...
   })
   ```

3. **Wrapper Component**: We've created a minimal standalone wrapper component (`TaigaUiWrapperComponent`) that imports and uses common dependencies like PolymorpheusModule.

## Integration Process

1. Upgraded Angular to v18
2. Updated Taiga UI packages from v3 to v4
3. Added missing peer dependencies to resolve import issues
4. Created a wrapper component for Taiga UI components
5. Used NO_ERRORS_SCHEMA to handle any remaining template issues

## Next Steps

1. Gradually replace the use of NO_ERRORS_SCHEMA with proper imports
2. Update individual components to use Taiga UI v4 components correctly
3. Implement proper module imports for each component's specific needs

## Migration Resources

- [Official Migration Guide (v3 -> v4)](https://taiga-ui.dev/migration-guide/)
- [Taiga UI Documentation](https://taiga-ui.dev/components/icon) 