declare module 'dompurify' {
    export interface Config {
        ADD_ATTR?: string[];
        ADD_DATA_URI_TAGS?: string[];
        ADD_TAGS?: string[];
        ALLOW_DATA_ATTR?: boolean;
        ALLOW_UNKNOWN_PROTOCOLS?: boolean;
        ALLOWED_ATTR?: string[];
        ALLOWED_TAGS?: string[];
        FORBID_ATTR?: string[];
        FORBID_TAGS?: string[];
        FORCE_BODY?: boolean;
        KEEP_CONTENT?: boolean;
        RETURN_DOM?: boolean;
        RETURN_DOM_FRAGMENT?: boolean;
        RETURN_DOM_IMPORT?: boolean;
        SAFE_FOR_JQUERY?: boolean;
        SANITIZE_DOM?: boolean;
        WHOLE_DOCUMENT?: boolean;
        ALLOWED_URI_REGEXP?: RegExp;
        SAFE_FOR_TEMPLATES?: boolean;
        ALLOW_ARIA_ATTR?: boolean;
        USE_PROFILES?: boolean | { mathMl?: boolean; svg?: boolean; svgFilters?: boolean; html?: boolean };
    }

    export type HookEvent = 'beforeSanitizeElements' | 'uponSanitizeElement' | 'afterSanitizeElements' | 'beforeSanitizeAttributes' | 'uponSanitizeAttribute' | 'afterSanitizeAttributes' | 'beforeSanitizeShadowDOM' | 'uponSanitizeShadowNode' | 'afterSanitizeShadowDOM';
    
    export type HookName = HookEvent;
} 