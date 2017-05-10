using Microsoft.IdentityModel.S2S.Protocols.OAuth2;
using System;
using System.Diagnostics;
using System.Net;

namespace QFSWeb.Utilities
{
    [Serializable]
    public class SharePointAcsSerializableContext : SharePointContext
    {
        private readonly string _contextToken;
        private DateTime? _contextTokenValidTo;

        private string _refreshToken;
        private string _targetPrincipalName;
        private string _targetRealm;
        private string _cacheKey;


        public bool IsContextTokenExpired
        {
            get { return ContextTokenValidTo < DateTime.UtcNow; }
        }

        private DateTime ContextTokenValidTo
        {
            get { return this._contextTokenValidTo ?? DateTime.MinValue; }
        }

        ///<summary>
        /// The context token.
        ///</summary>
        public string ContextToken
        {
            get { return IsContextTokenExpired ? null : this._contextToken; }
        }

        ///<summary>
        /// The context token’s "CacheKey" claim.
        ///</summary>
        public string CacheKey
        {
            get { return this._cacheKey; }
        }

        ///<summary>
        /// The context token’s "refreshtoken" claim.
        ///</summary>
        public string RefreshToken
        {
            get { return this._refreshToken; }
        }

        public override string UserAccessTokenForSPHost
        {
            get
            {
                return GetAccessTokenString(ref this.userAccessTokenForSPHost, () => GetAccessToken(SPHostUrl));
            }
        }

        public override string UserAccessTokenForSPAppWeb
        {
            get
            {
                return SPAppWebUrl == null
                    ? null
                    : GetAccessTokenString(ref this.userAccessTokenForSPAppWeb, () => GetAccessToken(SPAppWebUrl));
            }
        }

        public override string AppOnlyAccessTokenForSPHost
        {
            get
            {
                return GetAccessTokenString(ref this.appOnlyAccessTokenForSPHost, () => GetAppOnlyAccessToken(SPHostUrl));
            }
        }

        public override string AppOnlyAccessTokenForSPAppWeb
        {
            get
            {
                return SPAppWebUrl == null
                    ? null
                    : GetAccessTokenString(ref this.appOnlyAccessTokenForSPAppWeb, () => GetAppOnlyAccessToken(SPAppWebUrl));
            }
            }

        private OAuth2AccessTokenResponse GetAccessToken(Uri target)
        {
            return TokenHelper.GetAccessToken(_refreshToken, _targetPrincipalName, target.Authority, _targetRealm);
        }

        private OAuth2AccessTokenResponse GetAppOnlyAccessToken(Uri target)
        {
            return TokenHelper.GetAppOnlyAccessToken(TokenHelper.SharePointPrincipal, target.Authority, TokenHelper.GetRealmFromTargetUrl(target));
        }

        public SharePointAcsSerializableContext(Uri spHostUrl, Uri spAppWebUrl, string spLanguage, string spClientTag, string spProductNumber, string contextToken, SharePointContextToken contextTokenObj)
            : base(spHostUrl, spAppWebUrl, spLanguage, spClientTag, spProductNumber)
        {
            if (string.IsNullOrEmpty(contextToken))
            {
                throw new ArgumentNullException("contextToken");
            }

            if (contextTokenObj == null)
            {
                throw new ArgumentNullException("contextTokenObj");
            }

            this._contextToken = contextToken;

            this._refreshToken = contextTokenObj.RefreshToken;
            this._targetPrincipalName = contextTokenObj.TargetPrincipalName;
            this._targetRealm = contextTokenObj.Realm;
            this._contextTokenValidTo = contextTokenObj.ValidTo;
            this._cacheKey = contextTokenObj.CacheKey;
        }

        ///<summary>
        /// Ensures the access token is valid and returns it.
        ///</summary>
        ///<param name="accessToken">The access token to verify.</param>
        ///<param name="tokenRenewalHandler">The token renewal handler.</param>
        ///<returns>The access token string.</returns>
        private static string GetAccessTokenString(ref Tuple<string, DateTime> accessToken, Func<OAuth2AccessTokenResponse> tokenRenewalHandler)
        {
            RenewAccessTokenIfNeeded(ref accessToken, tokenRenewalHandler);

            return IsAccessTokenValid(accessToken) ? accessToken.Item1 : null;
        }

        ///<summary>
        /// Renews the access token if it is not valid.
        ///</summary>
        ///<param name="accessToken">The access token to renew.</param>
        ///<param name="tokenRenewalHandler">The token renewal handler.</param>
        private static void RenewAccessTokenIfNeeded(ref Tuple<string, DateTime> accessToken, Func<OAuth2AccessTokenResponse> tokenRenewalHandler)
        {
            if (IsAccessTokenValid(accessToken))
            {
                return;
            }

            Trace.TraceInformation("Renewing access token");

            try
            {
                OAuth2AccessTokenResponse oAuth2AccessTokenResponse = tokenRenewalHandler();

                DateTime expiresOn = oAuth2AccessTokenResponse.ExpiresOn;

                Trace.TraceInformation("Renewed access token. Expires on {0:s}", expiresOn);

                if ((expiresOn - oAuth2AccessTokenResponse.NotBefore) > AccessTokenLifetimeTolerance)
                {
                    // Make the access token get renewed a bit earlier than the time when it expires
                    // so that the calls to SharePoint with it will have enough time to complete successfully.
                    expiresOn -= AccessTokenLifetimeTolerance;
                }

                accessToken = Tuple.Create(oAuth2AccessTokenResponse.AccessToken, expiresOn);
            }
            catch (WebException)
            {
            }
        }
    }
}