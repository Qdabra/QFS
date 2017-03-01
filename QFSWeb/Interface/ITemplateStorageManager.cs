using InfoPathServices;
using QFSWeb.Models;
using QFSWeb.Utilities;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace QFSWeb.Interface
{
    public interface ITemplateStorageManager
    {
        IEnumerable<FormTemplateViewModel> ListTemplates(string userKey);

        Task<Tuple<bool, string, string>> StoreTemplate(string userKey, string templateName, bool createNew, Stream templateStream, string xsnFileName, bool allowDowngrade);

        Task<BlobFileInfo> GetTemplateFileWithCheck(string userId, string templateName, string instanceId, string fileName);

        Task<ManifestFileWithProperties> GetManifestForTemplateName(string templateName);

        Task<BlobFileInfo> GetXsnBlobInfo(string templateName);

        Task<bool> DeleteTemplate(string templateName);        
    }
}
