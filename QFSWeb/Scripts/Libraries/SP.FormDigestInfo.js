// Should probably only be used if you're using JSOM from somewhere without
// a __REQUESTDIGEST value or if you need more than just the digest value.
// To avoid having to make this asynchronous and deal with callbacks, this
// code assumes that you've run executeQueryAsync at least once with form
// digest handling enabled. (Default behavior - I think - but you can
// use get/set_formDigestHandlingEnabled if I'm wrong)
//
// Example:
// 
//     var ctx = SP.ClientContext.get_current();
//     ctx.executeQueryAsync(function(){
//         var formDigest = ctx.get_formDigestInfo();
//         console.log(formDigest.get_digestValue());
//     }, function(){ throw new Error('executeQueryAsync failed!'); });
//
// See the bottom of the file for info on the SP.FormDigestInfo class.

(function() {
    // Cached member name for the FormDigestInfo cache.
    var fdiCacheKey = null;
    
    /**
     * Grabs the cached SP.FormDigestInfo for a context. The first call will
     * attempt to resolve the member name used for the digest cache, throwing
     * an exception if that attempt fails.
     * @private
     * @param {(SP.ClientRuntimeContext|SP.ClientContext)} clientContext - subject
     * @returns {SP.FormDigestInfo}
     */
    function getCachedFormDigestInfo(clientContext) {
        // Grab the API url used to lookup our form digest instance.
        var apiUrl = clientContext.get_contextInfoUrl();
        
        // Attempt to resolve the cache member name if necessary
        if(fdiCacheKey === null) {
            for(var key in SP.ClientRuntimeContext) {
                var member = SP.ClientRuntimeContext[key];
                if(typeof(member) === 'object' &&
                  (member[apiUrl] instanceof SP.FormDigestInfo)) {
                    fdiCacheKey = key;
                    break;
                }
            }
            
            // verify the success of the attempt
            if(fdiCacheKey === null) {
                throw new Error('Failed to resolve the digest cache member ' +
                                'name. (Verify that executeQueryAsync was ' +
                                'called)')
            }
        }
        
        // Return the cached instance.
        return SP.ClientRuntimeContext[fdiCacheKey][apiUrl];
    }
    
    /**
     * Get the API url used for requesting context info. (Deobfuscated from
     * SP.ClientRuntimeContext.prototype.$2c_0)
     * @returns {string}
     */
    SP.ClientRuntimeContext.prototype.get_contextInfoUrl = function SP_ClientRuntimeContext$get_contextInfoUrl() {
        var webUrl = this.get_url();
        if(!webUrl.endsWith('/')) {
            webUrl += '/';
        }
        webUrl += '_api/contextinfo';
        return this.getRequestUrl(webUrl);
    };
    
    /**
     * Get the current cached form digest info instance for this context.
     * Note: Must call executeQueryAsync at least once with form digest
     * handling enabled. Failure to do so will result in an exception being
     * thrown.
     * @returns {SP.FormDigestInfo}
     */
    SP.ClientRuntimeContext.prototype.get_formDigestInfo = function SP_ClientRuntimeContext$get_formDigestInfo() {
        return getCachedFormDigestInfo(this);
    };
    
    // If SP.js has already been loaded, we'll need to manually copy over
    // the prototype extensions to the SP.ClientContext class.
    if(typeof(SP.ClientContext) !== 'undefined') {
        SP.ClientContext.prototype.get_contextInfoUrl = SP.ClientRuntimeContext.prototype.get_contextInfoUrl;
        SP.ClientContext.prototype.get_formDigestInfo = SP.ClientRuntimeContext.prototype.get_formDigestInfo;
    }
})();

// SP.FormDigestInfo Info:
// For some reason, SP.FormDigestInfo is only documented in some of the
// non-English versions of MSDN. The original English documentation that's
// missing from the main MSDN is included:
//
// https://msdn.microsoft.com/pt-br/library/office/dn754011.aspx
// 
// Note: The examples in the documentation are actually wrong and would throw
// an error if run. (They treat SP.FormDigestInfo like a singleton instance
// instead of the class that it is)
// 
// In case that documentation is removed at some point, the class just has
// few public members:
//
// new SP.FormDigestInfo() 
//
// string SP.FormDigestInfo.prototype.get_digestValue()
// string SP.FormDigestInfo.prototype.set_digestValue(string value)
//
// Date SP.FormDigestInfo.prototype.get_expiration()
// Date SP.FormDigestInfo.prototype.set_expiration(Date expiration)
//
// string SP.FormDigestInfo.prototype.get_webServerRelativeUrl()
// string SP.FormDigestInfo.prototype.set_webServerRelativeUrl(string value)
//
