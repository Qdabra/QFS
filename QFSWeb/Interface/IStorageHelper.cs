using QFSWeb.Utilities;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QFSWeb.Interface
{
    public interface IStorageHelper
    {
        Task<BlobFileInfo> GetFileAsync(string containerName, string fileName);

        Task<BlobFileInfo> UploadFile(string containerName, Stream inputStream, string fileName = null);

        Task DeleteContainer(string containerName);
    }
}
