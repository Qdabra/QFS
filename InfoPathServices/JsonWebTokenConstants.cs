﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace InfoPathServices
{
    public static class JsonWebTokenConstants
    {
        public const string HeaderType = "JWT";
        public const string TokenType = "http://oauth.net/grant_type/jwt/1.0/bearer";

        public static readonly DateTime BaseTime;

        public struct Algorithms
        {
            public const string ECDSA_SHA256 = "ES256";
            public const string ECDSA_SHA384 = "ES384";
            public const string ECDSA_SHA512 = "ES512";
            public const string HMAC_SHA256 = "HS256";
            public const string HMAC_SHA384 = "HS384";
            public const string HMAC_SHA512 = "HS512";
            public const string NONE = "none";
            public const string RSA_SHA256 = "RS256";
            public const string RSA_SHA384 = "RS384";
            public const string RSA_SHA512 = "RS512";
        }

        public struct ReservedClaims
        {
            public const string Actor = "actor";
            public const string ActorToken = "actortoken";
            public const string AppContext = "appctx";
            public const string Audience = "aud";
            public const string ExpiresOn = "exp";
            public const string IdentityProvider = "identityprovider";
            public const string IssuedAt = "iat";
            public const string Issuer = "iss";
            public const string NameIdentifier = "nameid";
            public const string NotBefore = "nbf";
        }

        public struct ReservedHeaderParameters
        {
            public const string Algorithm = "alg";
            public const string Type = "typ";
            public const string X509CertificateThumbprint = "x5t";
        }
    }
}
