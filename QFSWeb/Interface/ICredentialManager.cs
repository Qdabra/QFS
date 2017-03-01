using QFSWeb.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QFSWeb.Interface
{
    public interface ICredentialManager
    {
        List<AppInstance> GetAppInstances(string spHostWebDomain);

        AppInstance GetAppInstanceById(string instanceId, string spHostWebDomain);

        bool SaveOrUpdateAppInstance(AppInstance instance, string spHostWebDomain);

        AppInstance GetMatchingInstanceByUrl(string requestUrl);

        Task<bool> DeleteAppInstance(string instanceId, string spHostWebDomain);
    }
}
