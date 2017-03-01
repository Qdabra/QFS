using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using System.Xml.XPath;


namespace InfoPathServices
{
    public class GenerateBatch
    {

        #region Private Constants

        private const string WRONG_XSN_ERROR = "The attached XML is not the instance of the source XSN file. " +
                                               "Please attach the correct XML file.";
        private const string NO_MAPPING_ERROR = "Mapping is missing. Please check the mapping.";
        private const string GENERATE_BATCH_ERROR = "Error occurred generating the batch element \n Details: ";

        #endregion Private Constants


        public static XmlElement GenerateBatchElement(XmlDocument doc, XmlNamespaceManager docsNsMgr, XmlNode mapping, out Dictionary<int, XmlNode> methodMap)
        {
            string batchInnerXml = string.Empty;
            string qRulesListIdPath = GetListIdPath(mapping);

            //set up namespace manager for docs if not passed in
            if (null == docsNsMgr)
            {
                docsNsMgr = BuildNamespaceManager(doc);
            }

            XmlDocument batchDoc = new XmlDocument();
            XmlElement batch = batchDoc.CreateElement("Batch");
            batch.SetAttribute("OnError", "Continue");

            try
            {
                BuildBatchMulti(mapping, doc, docsNsMgr, qRulesListIdPath, batch, out methodMap);
            }
            catch (Exception ex)
            {
                throw new Exception(GENERATE_BATCH_ERROR
                    + ex.Message);
            }

            if (string.IsNullOrEmpty(batch.InnerXml))
            {
                return null;
            }

            return batch;

        }

        public static XmlNamespaceManager BuildNamespaceManager(XmlDocument doc)
        {
            XmlNamespaceManager docsNsMgr = new XmlNamespaceManager(doc.NameTable);
            //Could have an issue if the doc isn't using the default 'my' namespace - option may be here:
            //http://www.hanselman.com/blog/GetNamespacesFromAnXMLDocumentWithXPathDocumentAndLINQToXML.aspx
            //to just all the namespaces in the document to the table
            docsNsMgr.AddNamespace("my", doc.DocumentElement.NamespaceURI);
            return docsNsMgr;
        }

        public static string GetListIdPath(XmlNode mapping)
        {
            XmlNode path = mapping.SelectSingleNode(".//*[local-name() = 'FormField'][@*[local-name() = 'IsId'] = 'true']");
            return path == null ? null : path.InnerText;
        }

        public static void BuildBatchMulti(XmlNode mapping, XmlDocument doc,
            XmlNamespaceManager docsNsMgr, string qRulesListId, XmlNode batchNode)
        {
            Dictionary<int, XmlNode> methodNodeMap;
            BuildBatchMulti(mapping, doc, docsNsMgr, qRulesListId, batchNode, out methodNodeMap);
        }

        public static void BuildBatchMulti(XmlNode mapping, XmlDocument doc, XmlNamespaceManager docsNsMgr,
                                       string qRulesListIdPath, XmlNode batchNode, out Dictionary<int, XmlNode> methodNodeMap)
        {
            //2012-05-16, the schema has changed since we want to be able to create multiple mappings. The mapping file won't have the "my" prefix any longer, so using local-name in case used with qRules with an old mapping.
            string fieldMappingPath = ".//*[local-name() = 'Mapping']";
#if DEBUG
            int maxFields = 50;
            fieldMappingPath += "[position() < " + maxFields + "]";
#endif
            //get the mapping nodes
            methodNodeMap = new Dictionary<int, XmlNode>();
            XmlNodeList mappingNodes = mapping.SelectNodes(fieldMappingPath);

            //are we repeating?
            bool isRepeating;
            bool.TryParse(mapping.SelectSingleNode(".//*[local-name() = 'IsRepeating']").InnerText, out isRepeating);

            XmlNode qRulesListIdNode = null;

            string myPrefixNameSpace = string.Empty;


            //get the repeating group nodes 
            IEnumerable repeatingGroup;
            if (isRepeating && doc != null)
            {
                string repeatingGroupPath = GetRepeatingItemPath(mapping);

                repeatingGroup = doc.SelectNodes(repeatingGroupPath, docsNsMgr);
            }
            else
            {
                // Special case: When not repeating, we are just dealing with 1 parent node, which is the
                // whole document
                repeatingGroup = new XmlNode[] { doc };
            }

            //set the ID of the Method ID attribute 

            int methodId = 1;
            string cmd;
            int id = 0;

            foreach (XmlNode item in repeatingGroup)
            {
                id = 0;

                cmd = "New";
                //get the qrules list id node. Make sure it is an int value
                if (docsNsMgr != null && !String.IsNullOrEmpty(qRulesListIdPath))
                {
                    qRulesListIdNode = item.SelectSingleNode(qRulesListIdPath, docsNsMgr);
                    if (null != qRulesListIdNode)
                    {
                        if (int.TryParse(qRulesListIdNode.InnerText, out id) && id != 0)
                        {
                            cmd = "Update";
                        }
                    }
                }

                using (XmlWriter xWriter = batchNode.CreateNavigator().AppendChild())
                {
                    xWriter.WriteStartElement("Method");
                    xWriter.WriteAttributeString("ID", methodId.ToString());
                    xWriter.WriteAttributeString("Cmd", cmd);

                    //if this is an update, add the ID field
                    if (cmd.Equals("Update"))
                    {
                        xWriter.WriteStartElement("Field");
                        xWriter.WriteAttributeString("Name", "ID");
                        xWriter.WriteValue(id);
                        xWriter.WriteEndElement();
                    }

                    foreach (XmlNode mappingNode in mappingNodes)
                    {
                        CreateFieldNode(docsNsMgr, item, xWriter, mappingNode);
                        HandleAttachments(docsNsMgr, item, xWriter, mappingNode);
                    }


                    xWriter.WriteEndElement();
                    methodNodeMap.Add(methodId, item);
                }

                //increment methodId
                methodId++;
            }

        }

        private static void HandleAttachments(XmlNamespaceManager docsNsMgr, XmlNode group, XmlWriter xWriter, XmlNode mappingNode)
        {
            XmlNode formField = mappingNode.SelectSingleNode("*[local-name() = 'FormField']");
            XmlNode isAttachment = formField.SelectSingleNode("@*[local-name()='IsAttachment']");
            if (isAttachment == null || isAttachment.InnerText != "true")
                return;

            string fieldXpath = formField.InnerText;

            XmlNodeList attachments = group.SelectNodes(fieldXpath, docsNsMgr);

            if (attachments.Count == 0)
                return;

            xWriter.WriteStartElement("Attachments");
            foreach (XmlNode attachment in attachments)
            {
                xWriter.WriteStartElement("Attachment");
                xWriter.WriteValue(attachment.InnerText);
                xWriter.WriteEndElement();
            }
            xWriter.WriteEndElement();

        }

        private static void CreateFieldNode(XmlNamespaceManager docsNsMgr, XmlNode group, XmlWriter xWriter, XmlNode mappingNode)
        {
            XmlNode formField = mappingNode.SelectSingleNode("*[local-name() = 'FormField']");
            string fieldXpath = formField.InnerText;
            string columnName = mappingNode.SelectSingleNode("*[local-name() = 'SharePointColumn']").InnerText;
            XmlNode isRichText = formField.SelectSingleNode("@*[local-name()='IsRichText']");
            XmlNode isDate = formField.SelectSingleNode("@*[local-name() = 'IsDate']");


            if ((!fieldXpath.Equals(string.Empty)) && (!columnName.Equals(string.Empty)))
            {
                string fieldValue = string.Empty;
                XmlNode targetField = null;
                if (null == docsNsMgr ||
                    (targetField = group.SelectSingleNode(fieldXpath, docsNsMgr)) != null)
                {
                    //if the docsNsMgr is null, we just are building the correct xml for the qrules mapping
                    xWriter.WriteStartElement("Field");
                    xWriter.WriteAttributeString("Name", columnName);
                    //adding an attribute to indicate whether the field has been marked as RT
                    xWriter.WriteAttributeString("RichText", isRichText == null ? "false" : isRichText.Value);
                    if (targetField != null)
                    {
                        //if rich text, use inner xml
                        if (isRichText != null && isRichText.InnerText.ToLower().Equals("true"))
                        {
                            xWriter.WriteValue(targetField.InnerXml);
                        }
                        else if (isDate != null && isDate.InnerText.Equals("true", StringComparison.InvariantCultureIgnoreCase))
                        {
                            xWriter.WriteValue(GetDateValue(targetField.InnerText));
                        }
                        else
                        {
                            //xWriter.WriteValue(targetField.InnerText);
                            xWriter.WriteCData(targetField.InnerText);
                        }
                    }

                    xWriter.WriteEndElement();
                }
            }
        }

        private static string GetDateValue(string value)
        {
            DateTime parsed;
            if (DateTime.TryParse(value, out parsed))
            {
                return parsed.ToString("yyyy-MM-dd HH:mm:ss");
            }
            return string.Empty;
        }

        public static string GetRepeatingItemPath(XmlNode mappingNode)
        {
            return mappingNode.SelectSingleNode(".//*[local-name() = 'RepeatingGroup']").InnerText;
        }

    }
}
