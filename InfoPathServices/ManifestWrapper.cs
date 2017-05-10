using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;
using System.Xml;

namespace InfoPathServices
{
    public class ManifestWrapper
    {
        private string formName = "Form Name";
        private string formId = "Form ID";
        private string ipCompat = "InfoPath Compatibility";
        private string browserCompat = "Browser Compatible";
        private string solutionVersion = "Solution Version";
        private string trustSetting = "Trust Setting";
        private string trustLevel = "Trust Level";
        private string viewCount = "Number of Views";
        private string dataObjectCount = "Number of Data Connections";

        enum FVSupportedqRules
        {
            assigndocument,
            changeconnectionurl,
            changesubmiturl,
            copyrichtext,
            copytable,
            dateadd,
            datediff,
            decrypt,
            delete,
            deletefromsharepoint,
            delimitedlist,
            encode,
            encrypt,
            formatnumber,
            generateguid,
            getformproperty,
            getinputparameter,
            getlistguid,
            getuserprofilebyname,
            getweekday,
            getxml,
            insert,
            insertpi,
            jsontoxml,
            loadresource,
            makerequest,
            refreshsharepointlistitems,
            removedbxlpi,
            removepi,
            replacestring,
            savetodbxl,
            savetosharepoint,
            setcase,
            setdefaultview,
            setvalue,
            setxml,
            sorttable,
            submittodbxl,
            submittosharepoint,
            submittosharepointlist,
            swapdomwithdocument,
            transform,
            xmltojson
        };

        public XmlDocument Manifest;
        public XmlNamespaceManager NamespaceManager;

        public ManifestWrapper(string xml)
        {
            //load xml
            this.Manifest = new XmlDocument();
            this.Manifest.LoadXml(xml);

            //setup namespace table
            this.NamespaceManager = new XmlNamespaceManager(this.Manifest.NameTable);
            this.NamespaceManager.AddNamespace("xsf", "http://schemas.microsoft.com/office/infopath/2003/solutionDefinition");
            this.NamespaceManager.AddNamespace("xsf2", "http://schemas.microsoft.com/office/infopath/2006/solutionDefinition/extensions");
            this.NamespaceManager.AddNamespace("xsf3", "http://schemas.microsoft.com/office/infopath/2009/solutionDefinition/extensions");
        }

        public Property GetId()
        {
            return new Property(formId,
                GetNodeValue(this.Manifest.SelectSingleNode("xsf:xDocumentClass/@name", this.NamespaceManager)));
        }

        public Property GetTrustSetting()
        {
            //default value of trustSetting = manual. If not present = manual.
            //http://msdn.microsoft.com/en-us/library/office/bb264964(v=office.12).aspx
            return new Property(trustSetting,
                GetNodeValue(this.Manifest.SelectSingleNode("xsf:xDocumentClass/@trustSetting", this.NamespaceManager), "manual"));
        }

        public Property GetTrustLevel()
        {
            //if requireFullTrust="yes" it takes precedence over trustLevel. 
            //http://msdn.microsoft.com/en-us/library/office/bb264963(v=office.12).aspx
            //default value of requireFullTrust is no - I assume not present = no.
            string requireFullTrust = GetNodeValue(this.Manifest.SelectSingleNode("xsf:xDocumentClass/@requireFullTrust", this.NamespaceManager), "no");

            //if @requireFullTrust is yes, form is full trust. It doesn't seem possible to set to automatic and full trust
            if (requireFullTrust == "yes")
            {
                return new Property(trustLevel, "Full Trust");
            }

            //default value of trustLevel = domain. If not present = domain
            //http://msdn.microsoft.com/en-us/library/office/bb264963(v=office.12).aspx
            return new Property(trustLevel,
                GetNodeValue(this.Manifest.SelectSingleNode("xsf:xDocumentClass/@trustLevel", this.NamespaceManager), "domain"));

        }

        public Property GetInitialCaption()
        {
            return new Property(formName,
                GetNodeValue(this.Manifest.SelectSingleNode("xsf:xDocumentClass/xsf:fileNew/xsf:initialXmlDocument/@caption", this.NamespaceManager)));
        }

        public Property GetInfoPathVersion()
        {
            //get @solutionFormatVersion from xsf:xDocumentClass - 1.0. etc = IP2003, 2.0. etc = IP 2007, 3.0. etc = IP 2010, 15.0. etc = IP 2013
            string solutionFormatVersion = GetNodeValue(this.Manifest.SelectSingleNode("xsf:xDocumentClass/@solutionFormatVersion", this.NamespaceManager));
            string returnVersion = string.Empty;

            if (!string.IsNullOrEmpty(solutionFormatVersion))
            {
                //get up to first "."
                string fullVersion = solutionFormatVersion;
                string version = fullVersion.Substring(0, fullVersion.IndexOf("."));

                switch (version)
                {
                    case "1":
                        returnVersion = "InfoPath 2003";
                        break;
                    case "2":
                        returnVersion = "InfoPath 2007";
                        break;
                    case "3":
                        returnVersion = "InfoPath 2010";
                        break;
                    case "15":
                        returnVersion = "InfoPath 2013";
                        break;

                }
            }
            return new Property(ipCompat, returnVersion);
        }

        public Property BrowserCompatible()
        {
            //get compatibility @runtimeCompatibility
            //client = Filler Only
            //client server = Browser
            string compatibility = GetNodeValue(this.Manifest.SelectSingleNode("xsf:xDocumentClass/xsf:extensions/xsf:extension[@name='SolutionDefinitionExtensions']/xsf2:solutionDefinition/@runtimeCompatibility", this.NamespaceManager), "false");

            return new Property(browserCompat, (compatibility.ToLower() == "client server").ToString().ToLower());

        }

        public Property GetSolutionVersion()
        {
            return new Property(solutionVersion,
                GetNodeValue(this.Manifest.SelectSingleNode("xsf:xDocumentClass/@solutionVersion", this.NamespaceManager)));
        }

        public Property GetDataConnectionCount()
        {
            int connectionCount = 0;

            var connectionTypes = Enum.GetValues(typeof(ConnectionType)).Cast<ConnectionType>();

            foreach (var connectionType in connectionTypes)
            {
                connectionCount += this.Manifest.SelectNodes(string.Format("//xsf:{0}", connectionType.ToString()), this.NamespaceManager).Count;
            }
            return new Property(dataObjectCount, connectionCount.ToString());
        }

        public Property GetViewCount()
        {
            return new Property(viewCount,
                this.Manifest.SelectNodes("xsf:xDocumentClass/xsf:views/xsf:view", this.NamespaceManager).Count.ToString());
        }

        public void AddManifestProperties(List<Property> properties, double? formSize = null)
        {
            properties.Add(this.GetInitialCaption());
            properties.Add(this.GetId());
            properties.Add(this.GetSolutionVersion());
            properties.Add(this.GetInfoPathVersion());
            properties.Add(this.BrowserCompatible());
            properties.Add(this.GetTrustSetting());
            properties.Add(this.GetTrustLevel());
            properties.Add(this.GetDataConnectionCount());
            properties.Add(this.GetViewCount());
            properties.Add(this.GetRuleSetCount());
            properties.Add(this.GetActiveRuleActionCount());
            properties.Add(this.GetDisabledRuleActionCount());
            properties.Add(this.GetGenericRuleNameCount());
            properties.Add(this.GetCalculatedValueCount());

            var xsnSize = formSize.HasValue ? formSize.Value : Utilities.formSize;

            properties.Add(new Property("XSN Size (KB)", xsnSize.ToString()));

        }

        private Property GetCalculatedValueCount()
        {
            return new Property("Calculated Default Value Count", this.Manifest.SelectNodes("//xsf:calculatedField", this.NamespaceManager).Count.ToString());
        }

        private Property GetGenericRuleNameCount()
        {
            return new Property("Rule Action Names that start with 'Rule'", this.Manifest.SelectNodes("//xsf:rule[starts-with(@caption, 'Rule')]", this.NamespaceManager).Count.ToString());
        }

        private Property GetDisabledRuleActionCount()
        {
            return new Property("Disabled Rule Action Count", this.Manifest.SelectNodes("//xsf:rule[@isEnabled != 'yes']", this.NamespaceManager).Count.ToString());
        }

        private Property GetActiveRuleActionCount()
        {
            return new Property("Enabled Rule Action Count", this.Manifest.SelectNodes("//xsf:rule[@isEnabled = 'yes']", this.NamespaceManager).Count.ToString());
        }

        private Property GetRuleSetCount()
        {
            return new Property("Rule Set Count", this.Manifest.SelectNodes("//xsf:ruleSet", this.NamespaceManager).Count.ToString());
        }

        public string GetNodeValue(XmlNode node, string defaultValue)
        {
            return node != null ? node.InnerText : defaultValue;
        }

        public string GetNodeValue(XmlNode node)
        {
            return GetNodeValue(node, string.Empty);
        }

        public Dictionary<string, string> GetAllViewNames()
        {
            XmlNodeList nodes = this.Manifest.SelectNodes("xsf:xDocumentClass/xsf:views/xsf:view", this.NamespaceManager);
            Dictionary<string, string> viewNames = new Dictionary<string, string>();
            foreach (XmlNode node in nodes)
            {
                viewNames.Add(node.SelectSingleNode("xsf:mainpane/@transform", this.NamespaceManager).InnerText, node.SelectSingleNode("@name").InnerText);
            }
            return viewNames;
        }

        public List<DataConnection> GetAllDataConnectionInfo()
        {
            List<DataConnection> dcList = new List<DataConnection>();

            //start with DataObjects
            XmlNodeList dataObjects = this.Manifest.SelectNodes("//xsf:dataObject", this.NamespaceManager);

            foreach (XmlNode dataObject in dataObjects)
            {
                dcList.Add(PopulateDataConnectionInfo(dataObject));
            }

            //data adapters
            XmlNodeList dataAdapters = this.Manifest.SelectNodes("//xsf:dataAdapters/*", this.NamespaceManager);
            foreach (XmlNode dataAdapter in dataAdapters)
            {
                dcList.Add(PopulateDataConnectionInfo(dataAdapter));
            }

            //query - not a child of dataObject, this is /xsf:xDocumentClass/xsf:query for database bound forms
            XmlNode query = this.Manifest.SelectSingleNode("/xsf:xDocumentClass/xsf:query", this.NamespaceManager);
            string queryName = "";
            if (query != null)
            {
                DataConnection dc = PopulateDataConnectionInfo(query.SelectSingleNode("xsf:*", this.NamespaceManager));
                queryName = dc.Name;
                dcList.Add(dc);

            }

            //submit - this is the default submit connection
            XmlNode submit = this.Manifest.SelectSingleNode("/xsf:xDocumentClass/xsf:submit", this.NamespaceManager);
            if (submit != null)
            {
                XmlNode submitAdapter = submit.SelectSingleNode("xsf:*[substring(name(), string-length(name()) - 6) = 'Adapter']", this.NamespaceManager);

                if (submitAdapter != null)
                {
                    DataConnection dc = new DataConnection();
                    if (submitAdapter.LocalName == "useQueryAdapter")
                    {
                        dc.Name = queryName;
                        dc.DataConnectionProperties = new List<Property>();
                        dc.DataConnectionProperties.Add(new Property("useQueryAdapter", "true"));
                    }
                    else
                        dc = PopulateDataConnectionInfo(submitAdapter);

                    dc.DefaultSubmit = true;
                    dcList.Add(dc);
                }
            }

            return dcList;
        }

        private DataConnection PopulateDataConnectionInfo(XmlNode dataConnectionNode)
        {
            DataConnection dc = new DataConnection();
            string dcName = GetNodeValue(dataConnectionNode.SelectSingleNode("@name"));
            dc.Name = dcName;

            dc.QueryOnLoad = GetNodeValueAsBoolean(dataConnectionNode.SelectSingleNode("@initOnLoad"));

            XmlNode connectoid = FindUdcxInfo(dcName);
            dc.Udcx = connectoid != null;

            dc.DefaultSubmit = false;

            //for data objects, the connection information is a child of query
            if (dataConnectionNode.LocalName == "dataObject")
                dataConnectionNode = dataConnectionNode.SelectSingleNode("xsf:query/*", this.NamespaceManager);

            ConnectionType ctype;
            Enum.TryParse<ConnectionType>(dataConnectionNode.LocalName, true, out ctype);
            dc.ConnectionType = ctype;

            dc.DataConnectionProperties = GetDataConnectionPropertyList(dataConnectionNode, connectoid);

            return dc;
        }

        private List<Property> GetDataConnectionPropertyList(XmlNode dataConnection, XmlNode connectiod)
        {

            List<Property> propList = new List<Property>();

            AddToPropertyList(propList, dataConnection);
            AddToPropertyList(propList, connectiod);

            return propList;
        }

        private void AddToPropertyList(List<Property> propList, XmlNode node)
        {
            if (node == null)
                return;

            XmlNodeList attributes = node.SelectNodes("@*[local-name(.) != 'name' and . != '']");
            foreach (XmlNode attribute in attributes)
            {
                propList.Add(new Property(attribute.LocalName, attribute.InnerText));
            }

            //apply transform to node for additional properties from child elements
            AddTransformedProperties(propList, node);

        }

        private void AddTransformedProperties(List<Property> propList, XmlNode node)
        {
#if FIXFIX
            if (node.LocalName == "connectoid")
                node = Utilities.UdcxConnectionInfo(GetUdcxUri(node));
#endif
            if (node == null)
                return;

            string xmlString = Utilities.GetTransformedString(node.OuterXml, "DataConnectionTransform.xslt", null);

            if (string.IsNullOrEmpty(xmlString))
                return;

            XmlDocument xmldoc = new XmlDocument();
            xmldoc.LoadXml(xmlString);

            XmlNodeList props = xmldoc.SelectNodes("//Property");
            foreach (XmlNode prop in props)
            {
                propList.Add(new Property(GetNodeValue(prop.SelectSingleNode("Name"), ""), GetNodeValue(prop.SelectSingleNode("Value"), "")));
            }
        }

        private Uri GetUdcxUri(XmlNode node)
        {
            Uri udcxUri = null;

            string siteCollection = GetNodeValue(node.SelectSingleNode("@siteCollection", this.NamespaceManager), "");
            string source = GetNodeValue(node.SelectSingleNode("@source", this.NamespaceManager), "");
            string wsspath = GetNodeValue(this.Manifest.SelectSingleNode("//xsf2:solutionPropertiesExtension/xsf2:wss/@path", this.NamespaceManager), "");
            string baseUrl = GetNodeValue(this.Manifest.SelectSingleNode("//xsf3:solutionDefinition/xsf3:baseUrl/@relativeUrlBase", this.NamespaceManager), "");

            Uri.TryCreate(siteCollection + source, UriKind.Absolute, out udcxUri);
            if (udcxUri == null)
                Uri.TryCreate(wsspath + siteCollection + source, UriKind.Absolute, out udcxUri);
            if (udcxUri == null)
                Uri.TryCreate(baseUrl + "/" + wsspath + siteCollection + source, UriKind.Absolute, out udcxUri);

            return udcxUri;
        }

        private XmlNode FindUdcxInfo(string dataConnectionName)
        {
            return this.Manifest.SelectSingleNode(string.Format("//xsf2:connectoid[@name = '{0}']", dataConnectionName), this.NamespaceManager);
        }

        private bool? GetNodeValueAsBoolean(XmlNode xmlNode)
        {
            string value = GetNodeValue(xmlNode, "");

            if (value == "yes")
                return true;
            else if (value == "no")
                return false;

            return null;

        }

        public List<PromotedProperty> GetAllPromotedProperties()
        {
            XmlNodeList promotedNodes = this.Manifest.SelectNodes("xsf:xDocumentClass/xsf:listProperties/xsf:fields/xsf:field", this.NamespaceManager);
            List<PromotedProperty> propertyList = new List<PromotedProperty>();

            foreach (XmlNode promotedNode in promotedNodes)
            {
                PromotedProperty prop = new PromotedProperty();
                prop.Name = GetNodeValue(promotedNode.SelectSingleNode("@name"), "");
                prop.NodePath = GetNodeValue(promotedNode.SelectSingleNode("@node"), "");
                prop.DataType = GetNodeValue(promotedNode.SelectSingleNode("@type"), "");
                prop.Aggregation = GetNodeValue(promotedNode.SelectSingleNode("@aggregation"), "");

                propertyList.Add(prop);
            }

            return propertyList;

        }

        public List<QRulesInfo> GetAllQRules()
        {
            List<QRulesInfo> qRulesList = new List<QRulesInfo>();

            var qRuleNodes = Manifest.SelectNodes("/*/xsf:ruleSets/xsf:ruleSet/xsf:rule/xsf:assignmentAction[contains(@targetField , '/QdabraRules/Command')]", NamespaceManager);

            AddqRuleToList(qRulesList, qRuleNodes);

            var ruleSetsAction = Manifest.SelectNodes("/*/xsf:domEventHandlers/xsf:domEventHandler[@dataObject = 'QdabraRules']/xsf:ruleSetAction", NamespaceManager);

            foreach (XmlNode ruleSetAction in ruleSetsAction)
            {
                string ruleSet = GetNodeValue(ruleSetAction.SelectSingleNode("@ruleSet"));
                var qRuleNodesWithCommand = Manifest.SelectNodes("/*/xsf:ruleSets/xsf:ruleSet[@name = '" + ruleSet + "']/xsf:rule/xsf:assignmentAction[contains(@targetField , '/Command')]", NamespaceManager);

                AddqRuleToList(qRulesList, qRuleNodesWithCommand);
            }

            return qRulesList;
        }

        private void AddqRuleToList(List<QRulesInfo> qRulesList, XmlNodeList qRuleNodes)
        {
            foreach (XmlNode qRuleNode in qRuleNodes)
            {
                var qRuleExpression = GetNodeValue(qRuleNode.SelectSingleNode("@expression"));

                if (string.IsNullOrEmpty(qRuleExpression))
                {
                    continue;
                }

                var commandMatch = new Regex(@"^(?:concat\()?['""](\S+)(?:\s|$).*");
                var match = commandMatch.Match(qRuleExpression);

                if (!match.Success)
                {
                    continue;
                }

                var qRuleName = match.Groups[1].Value;
                if (qRuleName.EndsWith("\""))
                {
                    qRuleName = qRuleName.Substring(0, qRuleName.Length - 1);
                }

                var currentQRule = qRulesList.Where(x => x.Name == qRuleName);

                if (currentQRule.Any())
                {
                    currentQRule.First().Count++;
                }
                else
                {
                    var fvSupported = Enum.IsDefined(typeof(FVSupportedqRules), qRuleName.ToLower());
                    qRulesList.Add(new QRulesInfo(qRuleName, fvSupported));
                }
            }
        }
    }
}