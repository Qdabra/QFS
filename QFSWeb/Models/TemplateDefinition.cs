using InfoPathServices;
using System.Collections.Generic;
using System.Linq;

namespace QFSWeb.Models
{
    public class TemplateDefinition
    {
        public string XsnUrl { get; set; }
        public string LibraryUrl { get; set; }
        public string TemplateName { get; set; }
        public string InstanceId { get; set; }
        public List<FormFile> Files { get; set; }

        public TemplateDefinition()
        {
            Files = new List<FormFile>();
        }

        public void InitializeInstanceId(ManifestFileWithProperties manifest)
        {
            if (manifest == null)
            {
                return;
            }

            InstanceId = manifest.GetInstanceId();
        }
    }
}