using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Web;
using System.Xml;


namespace InfoPathServices
{
    public class XsnWrapper : IDisposable
    {
        public string FolderPath { get; set; }
        /// <summary>
        /// A list of all of the files in the XSN
        /// </summary>
        public string[] XsnContents { get; set; }
        public ManifestWrapper Manifest { get; set; }

        public XsnWrapper(string templateFilePath)
        {
            this.FolderPath = Utilities.UncabXsn(templateFilePath);
            this.XsnContents = Directory.GetFiles(this.FolderPath);
            AddOriginalFile(Path.Combine(FolderPath, TemplateFileName));
            this.Manifest = new ManifestWrapper(System.IO.File.ReadAllText(Path.Combine(this.FolderPath, ManifestFileName)));
        }

        public List<Property> GetAllXsnProperties(double? formSize = null)
        {
            List<Property> properties = new List<Property>();
            this.AddSampleDataInfo(properties);
            this.AddRepeatingStructureInfo(properties);
            this.Manifest.AddManifestProperties(properties, formSize);
            //this.AddRepeatingGroupWithSiblingsInfo(properties);

            return properties;
        }

        public string ManifestFileName
        {
            get { return InfoPathAnalytics.manifestPath; }
        }

        public string TemplateFileName
        {
            get
            {
                return InfoPathAnalytics.TemplateDefaultName;
            }
        }

        private void AddRepeatingStructureInfo(List<Property> properties)
        {
            try
            {
                XmlDocument xmlDoc = new XmlDocument();
                xmlDoc.Load(Path.Combine(this.FolderPath, "myschema.xsd"));

                //setup namespace table
                XmlNamespaceManager nsmgr = new XmlNamespaceManager(xmlDoc.NameTable);
                nsmgr.AddNamespace("xsd", "http://www.w3.org/2001/XMLSchema");

                //get the nodes that contain maxOccurs unbounded
                XmlNodeList repeaters = xmlDoc.SelectNodes("//xsd:element[@maxOccurs='unbounded']", nsmgr);

                //Sample Data xml
                XmlDocument sampleXmlDoc = new XmlDocument();
                sampleXmlDoc.Load(Path.Combine(this.FolderPath, "sampledata.xml"));

                //setup namespace table for Sample data
                XmlNamespaceManager sampleNsmgr = new XmlNamespaceManager(sampleXmlDoc.NameTable);
                sampleNsmgr.AddNamespace("my", sampleXmlDoc.DocumentElement.NamespaceURI);

                //start with result as none
                string result = "None";

                foreach (XmlNode repeater in repeaters)
                {
                    //set result to Simple since we now know there is some repeating data
                    if (result == "None")
                        result = "Simple";

                    //get the node from Sample data based on the ref attribute
                    XmlNode repeatingNode = sampleXmlDoc.SelectSingleNode(string.Format("//{0}", repeater.SelectSingleNode("@ref").InnerText), sampleNsmgr);
                    //check the descendants to see if any are repeating
                    XmlNodeList descendants = repeatingNode.SelectNodes("descendant::*", sampleNsmgr);

                    foreach (XmlNode descendant in descendants)
                    {
                        //see if there is an unbounded element with ref = descendant's node name
                        XmlNode test = xmlDoc.SelectSingleNode(string.Format("//xsd:element[@maxOccurs='unbounded' and @ref = '{0}']", descendant.Name), nsmgr);
                        if (test != null)
                        {
                            result = "Complex";
                            break;
                        }
                    }

                    if (result == "Complex")
                        break;
                }

                properties.Add(new Property("Repeating Data", result));

            }
            catch (Exception)
            {
                //fail silently for now - myschema.xsd may not exist
            }
        }

        private void AddSampleDataInfo(List<Property> properties)
        {
            XmlDocument xmlDoc = new XmlDocument();
            xmlDoc.Load(Path.Combine(this.FolderPath, "sampledata.xml"));

            //setup namespace table for Sample data
            XmlNamespaceManager nsmgr = new XmlNamespaceManager(xmlDoc.NameTable);
            nsmgr.AddNamespace("xd", "http://schemas.microsoft.com/office/infopath/2003");

            properties.Add(new Property("Schema Element count", xmlDoc.SelectNodes("//*[not(ancestor-or-self::xd:DataConnection) and not(ancestor-or-self::xd:SchemaInfo)]", nsmgr).Count.ToString()));
            properties.Add(new Property("Schema Atribute count", xmlDoc.SelectNodes("//@*[not(ancestor-or-self::xd:DataConnection) and not(ancestor-or-self::xd:SchemaInfo)]", nsmgr).Count.ToString()));
            properties.Add(new Property("Node names starting with 'Group'", xmlDoc.SelectNodes("//*[starts-with(local-name(),'group')]").Count.ToString()));
            properties.Add(new Property("Node names starting with 'Field'", xmlDoc.SelectNodes("//*[starts-with(local-name(),'field')]").Count.ToString()));
        }

        private void AddOriginalFile(string templateFile)
        {
            var xsnContents = XsnContents;
            Array.Resize(ref xsnContents, xsnContents.Length + 1);
            xsnContents[xsnContents.Length - 1] = templateFile;

            XsnContents = xsnContents;
        }

        public List<MigrationAnalysisInfo> AddRepeatingStructureWithSiblingsInfo(List<MigrationAnalysisInfo> properties)
        {
            try
            {
                XmlDocument xmlDoc = new XmlDocument();
                xmlDoc.Load(Path.Combine(this.FolderPath, "myschema.xsd"));

                //setup namespace table
                XmlNamespaceManager nsmgr = new XmlNamespaceManager(xmlDoc.NameTable);
                nsmgr.AddNamespace("xsd", "http://www.w3.org/2001/XMLSchema");

                //get the nodes that contain maxOccurs unbounded
                XmlNodeList repeaters = xmlDoc.SelectNodes("//xsd:element//xsd:sequence", nsmgr);

                int count = 0;
                foreach (XmlNode repeater in repeaters)
                {
                    if (repeater.ChildNodes.Count > 1)
                    {
                        foreach (XmlNode childnode in repeater.ChildNodes)
                        {
                            if (childnode.Attributes["maxOccurs"] != null && (childnode.Attributes["maxOccurs"].Value != "0" || childnode.Attributes["maxOccurs"].Value != "1"))
                            {
                                count++;
                            }
                        }
                    }
                }
                if (count > 0)
                {
                    properties.Add(new MigrationAnalysisInfo("Breaking", "The form's main data source contains repeating elements with siblings, which can cause data corruption and other issues.", count));
                }
            }
            catch (Exception)
            {
                //fail silently for now - myschema.xsd may not exist
            }

            return properties;
        }

        /// <summary>
        /// Disposes of files in temporary directory associated with this XSN
        /// </summary>
        public void Dispose()
        {
            try
            {
                // Add task to queue for cleanup
                Utilities.CleanUpCab(this.FolderPath);
            }
            catch (Exception e)
            {
                Trace.TraceError("XsnFolderWrapper.Dispose " + e);
                throw;
            }
        }

        void IDisposable.Dispose()
        {
            Dispose();
        }
    }
}