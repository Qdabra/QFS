using System.Xml.Serialization;

namespace QFSWeb.Models
{
    [XmlRoot(Namespace = "http://qdabra.com/webservices/")]
    public class SubmitDocument
    {
        public string docTypeName { get; set; }

        public string xml { get; set; }

        public string name { get; set; }

        public string author { get; set; }

        public string description { get; set; }

        public bool allowOverwrite { get; set; }

        [XmlNamespaceDeclarations]
        public XmlSerializerNamespaces xmlns = new XmlSerializerNamespaces();

        public SubmitDocument()
        {
            xmlns.Add("tns", "http://qdabra.com/webservices/");

            docTypeName = string.Empty;
            xml = string.Empty;
            name = string.Empty;
            author = string.Empty;
            description = string.Empty;
        }
    }
}