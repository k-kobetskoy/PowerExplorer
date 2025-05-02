export const environment = {
    production: true,
    msalConfig: {
        auth: {
            clientId: '${CLIENT_ID}',
            authority: '${AUTHORITY_URL}'
        }
    },
    apiConfig: {
        scopes: ['${API_SCOPES}'],
        uri: '${API_URI}'
    }
}; 