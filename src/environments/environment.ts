export const environment = {
    production: false,
    msalConfig: {
        auth: {
            clientId: 'ecf5ee34-a289-457c-908a-079a2a431d86',
            authority: 'https://login.microsoftonline.com/common/oauth2/authorize?resource=https://globaldisco.crm.dynamics.com'
        }
    },
    apiConfig: {
        scopes: ['https://globaldisco.crm.dynamics.com/user_impersonation'],
        uri: 'https://globaldisco.crm.dynamics.com/api/discovery/v2.0/Instances'
    }
  };