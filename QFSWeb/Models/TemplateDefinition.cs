using InfoPathServices;
using System.Collections.Generic;
using System.Linq;

namespace QFSWeb.Models
{
    public class TemplateDefinition
    {
        const string KeyInstanceId = "instanceId";

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

            if (manifest.FormProperties == null)
            {
                return;
            }

            var formProperties = manifest.FormProperties.FormProperties;

            InstanceId = GetPropertyValue(formProperties, KeyInstanceId);
        }

        private string GetPropertyValue(List<Property> properties, string propertyKey)
        {
            if (properties == null || properties.Count == 0)
            {
                return null;
            }

            var filterProperty = properties.Where(x => x.Name == propertyKey);

            if (!filterProperty.Any())
            {
                return null;
            }

            return filterProperty.FirstOrDefault().Value;
        }
    }
}