using Microsoft.Deployment.Compression.Cab;
using Microsoft.SharePoint.Client;
#if RUN_IN_AZURE
using Microsoft.WindowsAzure;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Blob;
using Microsoft.WindowsAzure.ServiceRuntime;
#endif
using Qdabra.TemplateAnalysis;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.ServiceModel.Web;
using System.Text;
using System.Web;
using System.Xml;
using System.Xml.Serialization;
using System.Xml.Xsl;
using System.Security.Claims;
using Wictor.Office365;
using System.Xml.XPath;
using System.Reflection;
using Microsoft.Azure;

namespace InfoPathServices
{
#if !RUN_IN_AZURE
    // Helper class for running on-premise and not using Azure
    internal class CloudBlockBlob
    {
        static string s_rootBlobFolderPath = System.Configuration.ConfigurationManager.AppSettings["BlobPath"];
        private string m_filePath;
        public CloudBlockBlob(string folderName, string filename)
        {
            m_filePath = Path.Combine(s_rootBlobFolderPath, folderName, filename);
        }
        public Stream OpenRead()
        {
            return new FileStream(m_filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        }
    }
#endif

    public static class Utilities
    {

        //for form size in KB - set on initial download
        internal static double formSize;

        public static Uri GetLibraryUri(string urlString)
        {
            try
            {
                return new Uri(urlString);
            }
            catch (Exception ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public static Guid GetLibraryGuid(string guidString)
        {
            try
            {
                return new Guid(guidString);
            }
            catch (Exception ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public static bool ExpandCabFile(string cabFile, string destDir)
        {
            if (!Directory.Exists(destDir))
            {
                DirectoryInfo dir = Directory.CreateDirectory(destDir);
            }
            if (!Directory.Exists(destDir)) return false;

            CabInfo cab = new CabInfo(cabFile);
            cab.Unpack(destDir);
            return true;
        }

        public static Uri GetLibraryTemplateUrl(string libraryUrl)
        {
            string templateStoragePath = "/forms/template.xsn";

            Uri libraryUri = GetLibraryUri(libraryUrl);
            Uri templateUri = null;

            if (!libraryUri.ToString().ToLower().Contains(templateStoragePath))
                templateUri = new Uri(libraryUri.AbsoluteUri.ToString() + templateStoragePath);
            else
                templateUri = libraryUri;

            return AddNoRedirectToUrl(templateUri);
        }

        public static Uri AddNoRedirectToUrl(string url)
        {
            return AddNoRedirectToUrl(new Uri(url));
        }

        public static Uri AddNoRedirectToUrl(Uri url)
        {
            var qs = HttpUtility.ParseQueryString(url.Query.ToString());
            qs.Set("NoRedirect", "true");
            UriBuilder uriBuilder = new UriBuilder(url);
            uriBuilder.Query = qs.ToString();
            return uriBuilder.Uri;

        }

        public static string GenerateWorkingName()
        {
            return string.Format("template{0}", DateTime.Now.ToString("yyyyMMddHHmmssffff"));
        }

        private static string s_localXsnStoragePath = null;
        public static string LocalXsnTempFolder
        {
            get
            {
                if (s_localXsnStoragePath == null)
                {
                    try
                    {
#if RUN_IN_AZURE
                        if (RoleEnvironment.IsAvailable)
                        {
                            LocalResource folder = RoleEnvironment.GetLocalResource("XSNTempStorage");
                            s_localXsnStoragePath = folder.RootPath;
                        }

#else
                    string xsnStorage = System.Configuration.ConfigurationManager.AppSettings["XSNStoragePath"];
                    if (!string.IsNullOrEmpty(xsnStorage))
                    {
                        if (!Directory.Exists(xsnStorage))
                        {
                            string msgFmt = "XSNStoragePath directory '{0}' does not exist.";
                            throw new ApplicationException(string.Format(msgFmt, xsnStorage));
                        }
                        s_localXsnStoragePath = xsnStorage;
                    }
#endif
                        else
                        {
                            //TODO: Add config setting for specifying location of xsn storage
                            s_localXsnStoragePath = Path.GetTempPath();
                        }
                    }
                    catch (Exception e)
                    {
                        throw;
                    }
                }
                return s_localXsnStoragePath;
            }
        }
        public static string GenerateTemplateFilePath(string workingName)
        {
            return Path.Combine(LocalXsnTempFolder, Path.ChangeExtension(workingName, ".xsn"));
        }

        public static string GetFileText(string templateFileName, string fileName)
        {
            using (var wrapper = new XsnWrapper(templateFileName))
            {
                return System.IO.File.ReadAllText(Path.Combine(wrapper.FolderPath, fileName));
            }
        }

        public static Stream GetFileStream(string templateFileName, string fileName)
        {
            string targetFolderForCab = UncabXsn(templateFileName);
            MemoryStream ms = new MemoryStream();
            using (Stream fileStream = System.IO.File.Open(Path.Combine(targetFolderForCab, fileName), FileMode.Open, FileAccess.Read))
            {
                fileStream.CopyTo(ms);
            }

            ms.Position = 0L;

            CleanUpCab(targetFolderForCab);
            return ms;
        }

        public static string GetTransformedString(string stringToTransform, string transformName, Dictionary<string, string> parameters, bool allowScript = false)
        {
            XsltArgumentList transformArgs = new XsltArgumentList();

            if (parameters != null)
            {
                foreach (KeyValuePair<string, string> pair in parameters)
                {
                    transformArgs.AddParam(pair.Key, "", pair.Value);
                }
            }

            var transform = LoadXsltFromEmbeddedResource(transformName, allowScript);

            StringBuilder sb = new StringBuilder();
            using (StringReader sr = new StringReader(stringToTransform))
            {
                using (XmlReader xr = XmlReader.Create(sr))
                {
                    using (TextWriter tw = new StringWriter(sb))
                    {
                        transform.Transform(xr, transformArgs, tw);
                    }
                }
            }

            return sb.ToString();
        }

        private static Stream GetEmbeddedResourceStream(string transformName)
        {
            var currentAssembly = Assembly.GetExecutingAssembly();
            var stream = currentAssembly.GetManifestResourceStream(String.Format("InfoPathServices.XSL.{0}", transformName));

            return stream;
        }

        private static XslCompiledTransform LoadXsltFromEmbeddedResource(string transformName, bool allowScript = false)
        {
            XslCompiledTransform transform = new XslCompiledTransform();
            var settings = new XsltSettings();
            settings.EnableScript = allowScript;

            using (var stream = GetEmbeddedResourceStream(transformName))
            {
                using (var streamReader = new StreamReader(stream))
                {
                    using (XmlReader transReader = XmlReader.Create(streamReader))
                    {
                        transform.Load(transReader, settings, new XmlUrlResolver());
                    }
                }
            }

            return transform;
        }

        public static Uri GetHrefFromXml(XmlDocument doc)
        {
            //returning null if the href is not a valid URI
            //to handle for "preview" situations, where href won't have library

            string hrefString = string.Empty;
            Uri href = null;

            XmlNode processingInstructions = doc.SelectSingleNode("/processing-instruction()[local-name(.) = 'mso-infoPathSolution']");

            if (processingInstructions != null)
            {
                XmlElement piEl = (XmlElement)doc.ReadNode(XmlReader.Create(new StringReader("<pi " + processingInstructions.Value + "/>")));
                hrefString = piEl.GetAttribute("href");

            }

            try { href = new Uri(hrefString); }
            catch { }

            if (href.Scheme.StartsWith("http"))
                return href;
            else
                return null;
        }

        public static void CheckPreReqs(string libraryUrl, string xsnUrl, string fileName)
        {
            CheckPreReqs(libraryUrl, xsnUrl);

            if (string.IsNullOrEmpty(fileName))
            {
                throw new WebFaultException<string>(
                            string.Format("You must provide a value for the fileName parameter."),
                            HttpStatusCode.NotFound);
            }
        }

        public static void CheckPreReqs(string libraryUrl, string xsnUrl)
        {
            if (string.IsNullOrEmpty(libraryUrl) && string.IsNullOrEmpty(xsnUrl))
            {
                throw new WebFaultException<string>(
                            string.Format("You must provide a value for either the libraryUrl parameter or the xsnUrl parameter."),
                            HttpStatusCode.NotFound);
            }

        }

        public static FormFile GetFormFile(ClientContext context, string libraryUrl, string xsnUrl, string fileName)
        {
            CheckPreReqs(libraryUrl, xsnUrl, fileName);

            return new FormFile(fileName, GetFileText(DownloadXsn(context, libraryUrl, xsnUrl), fileName));

        }

        public static Stream GetFormFileStream(ClientContext context, string libraryUrl, string xsnUrl, string fileName)
        {
            CheckPreReqs(libraryUrl, xsnUrl, fileName);

            return GetFileStream(DownloadXsn(context, libraryUrl, xsnUrl), fileName);

        }

        public static string SaveFormFileRequest(FormFileRequest formFileRequest)
        {
            string workingName = Utilities.GenerateWorkingName();
            string templateFileName = Utilities.GenerateTemplateFilePath(workingName);

            System.IO.File.WriteAllBytes(templateFileName, formFileRequest.Form);

            return templateFileName;
        }

        public static string DownloadXsn(ClientContext context, Microsoft.SharePoint.Client.File file)
        {
            string workingName = Utilities.GenerateWorkingName();
            string templateFileName = Utilities.GenerateTemplateFilePath(workingName);

            try
            {
                DownloadItem(context, file, templateFileName);

                return templateFileName;
            }
            catch (Exception ex)
            {
                string debug = System.Configuration.ConfigurationManager.AppSettings["DEBUG"];
                string msg = ex.Message;
                if (!string.IsNullOrEmpty(debug) && string.Equals(debug, "true", StringComparison.InvariantCultureIgnoreCase))
                {
                    msg = ex.ToString();
                }
                throw new WebFaultException<string>(msg, System.Net.HttpStatusCode.InternalServerError);
            }
        }

        public static string DownloadXsn(ClientContext context, string libraryUrl, string xsnUrl)
        {
            string workingName = Utilities.GenerateWorkingName();
            string templateFileName = Utilities.GenerateTemplateFilePath(workingName);

            Uri templateUrl = string.IsNullOrWhiteSpace(xsnUrl) ? Utilities.GetLibraryTemplateUrl(libraryUrl) : Utilities.AddNoRedirectToUrl(xsnUrl);
            DownloadItem(context, templateUrl, templateFileName);

            return templateFileName;
        }

        public static string CopyXsnLocal(Stream fileStream)
        {
            string workingName = Utilities.GenerateWorkingName();
            string templateFileName = Utilities.GenerateTemplateFilePath(workingName);

            try
            {
                SaveStreamToFile(templateFileName, fileStream);
                //for use in form properties
                formSize = (double)new System.IO.FileInfo(templateFileName).Length / 1024.0;

                return templateFileName;
            }
            catch (Exception ex)
            {
                string debug = System.Configuration.ConfigurationManager.AppSettings["DEBUG"];
                string msg = ex.Message;
                if (!string.IsNullOrEmpty(debug) && string.Equals(debug, "true", StringComparison.InvariantCultureIgnoreCase))
                {
                    msg = ex.ToString();
                }
                throw new WebFaultException<string>(msg, System.Net.HttpStatusCode.InternalServerError);
            }
        }

        public static void DownloadItem(ClientContext context, Microsoft.SharePoint.Client.File file, string fullPath)
        {
            context.Load(file);
            context.ExecuteQuery();

            ClientResult<Stream> data = file.OpenBinaryStream();
            context.ExecuteQuery();

            SaveStreamToFile(fullPath, data.Value);
            //for use in form properties
            formSize = (double)new System.IO.FileInfo(fullPath).Length / 1024.0;
        }

        public static void SaveStreamToFile(string fullPath, Stream sourceStream)
        {
            using (Stream stream = System.IO.File.Create(fullPath))
            {
                const int bufferSize = 200000;

                var length = 1;
                var readBuffer = new Byte[bufferSize];
                while (length > 0)
                {
                    // data.Value holds the Stream
                    length = sourceStream.Read(readBuffer, 0, bufferSize);
                    stream.Write(readBuffer, 0, length);
                    readBuffer = new Byte[bufferSize];
                }
                stream.Flush();
            }
        }

        public static void DownloadItem(ClientContext context, Uri itemUri, string fullPath)
        {
            try
            {
                var start = DateTime.Now;

                var itemRelativeUrl = itemUri.AbsolutePath;
                var file = context.Web.GetFileByServerRelativeUrl(itemRelativeUrl);

                DownloadItem(context, file, fullPath);

                var end = DateTime.Now;
                var elapsed = end - start;
            }
            catch (Exception ex)
            {
                throw new ApplicationException(string.Format("Could not download the XSN at {0}.", itemUri.AbsoluteUri), ex);

                string debug = System.Configuration.ConfigurationManager.AppSettings["DEBUG"];
                string msg = ex.Message;
                if (!string.IsNullOrEmpty(debug) && string.Equals(debug, "true", StringComparison.InvariantCultureIgnoreCase))
                {
                    msg = ex.ToString();
                }
                throw new WebFaultException<string>(msg, HttpStatusCode.InternalServerError);
            }
        }

        public static string UncabXsn(string templateFilePath)
        {
            var start = DateTime.Now;

            string cabFileName = Path.ChangeExtension(templateFilePath, ".cab");
            string targetFolderForCab = Path.Combine(Path.GetDirectoryName(templateFilePath), Path.GetFileNameWithoutExtension(templateFilePath));

            //Create target directory if not exists.
            if (!Directory.Exists(targetFolderForCab))
            {
                Directory.CreateDirectory(targetFolderForCab);
            }

            System.IO.File.Copy(templateFilePath, Path.Combine(targetFolderForCab, InfoPathAnalytics.TemplateDefaultName), true);
            //move to rename .xsn to .cab - move will remove the .xsn
            System.IO.File.Move(templateFilePath, cabFileName);

            //extract
            Utilities.ExpandCabFile(cabFileName, targetFolderForCab);

            var end = DateTime.Now;
            var elapsed = end - start;

            return targetFolderForCab;
        }

        public static int GetLinesInFile(string fullFilePath)
        {
            return System.IO.File.ReadAllLines(fullFilePath).Length;
        }

        public static long GetSizeOfFile(string fullFilePath)
        {
            return new System.IO.FileInfo(fullFilePath).Length;
        }

        public static void CleanUpCab(string cabFolder)
        {
            if (Directory.Exists(cabFolder))
                Directory.Delete(cabFolder, true);
            if (System.IO.File.Exists(Path.ChangeExtension(cabFolder, "cab")))
                System.IO.File.Delete(Path.ChangeExtension(cabFolder, "cab"));
        }

        public static List<ViewInfo> GetViewInfos(XsnWrapper xsnWrapper)
        {
            List<ViewInfo> viewInfos = new List<ViewInfo>();

            //get view list - key is file name, value is view name
            Dictionary<string, string> viewNames = xsnWrapper.Manifest.GetAllViewNames();

            //for each, name and length
            foreach (KeyValuePair<string, string> view in viewNames)
            {
                string fullViewPath = Path.Combine(xsnWrapper.FolderPath, view.Key);

                viewInfos.Add(new ViewInfo(view.Value, view.Key, Utilities.GetLinesInFile(fullViewPath), Utilities.GetSizeOfFile(fullViewPath)));
            }

            return viewInfos;
        }

        public static List<MigrationAnalysisInfo> GetFormAnalysisInfos(XsnWrapper xsnWrapper)
        {
            List<MigrationAnalysisInfo> migrationInfos = new List<MigrationAnalysisInfo>();

            //get view list - key is file name, value is view name
            Dictionary<string, string> viewNames = xsnWrapper.Manifest.GetAllViewNames();

            //for each, name and length
            foreach (KeyValuePair<string, string> view in viewNames)
            {
                XmlNamespaceManager nsmgr;
                XmlDocument xmlDoc = GetXmlDoc(xsnWrapper.FolderPath, view.Key, out nsmgr);

                // Case 42480
                XmlNodeList multiselectlistboxes = xmlDoc.SelectNodes("//span[@xd:xctname='multiselectlistbox']", nsmgr);
                XmlNodeList comboboxes = xmlDoc.SelectNodes("//span[@xd:xctname='combobox']", nsmgr);
                XmlNodeList dropdownList = xmlDoc.SelectNodes("//select[@xd:xctname='dropdown']//xsl:variable [@name='uniqueItems']", nsmgr);
                XmlNodeList externalItemPickers = xmlDoc.SelectNodes("//object[@xd:xctname='entitypicker']", nsmgr);
                XmlNodeList hyperlinks = xmlDoc.SelectNodes("//span[@xd:xctname='HyperlinkBox']", nsmgr);

                AddMigrationInfo(migrationInfos, "Breaking", "Multiple-Selection List Boxes - Not currently supported in FormsViewer.", multiselectlistboxes);
                AddMigrationInfo(migrationInfos, "Breaking", "External Item Pickers - Not currently supported in FormsViewer.", externalItemPickers);
                AddMigrationInfo(migrationInfos, "Warning", "Combo Boxes - FormsViewer displays a combo box control as a dropdown and that means no support for manually typing in entries.\nWorkaround: Add an Other option to your dropdown and use it to conditionally hide the dropdown control and show a text box control that allows free text entry. Add a button to the right of this control that toggles back to the dropdown.", comboboxes);
                AddMigrationInfo(migrationInfos, "Warning", "Dropdowns with Show Unique Entries - Form contains dropdown boxes with the 'Show only entries with unique display names' option. This may cause some form slowness.", dropdownList);
                AddMigrationInfo(migrationInfos, "Breaking", "Hyperlink Controls - FormsViewer does not support hyperlink controls because they are not very useful and there is a simple workaround.\nPlease change to a static hyperlink control using these steps:\n1) right click the hyperlink control in the view of your form (after opening the XSN in the InfoPath Designer) and change to text box.\n2) put your cursor under the text field and from the Designer menu, choose Insert->Hyperlink from InfoPath Designer) and change properties to Link to the data source field that you are using for the text box in your form's view.", hyperlinks);
            }

            return migrationInfos;
        }

        private static XmlDocument GetXmlDoc(string folderPath, string viewName, out XmlNamespaceManager nsmgr)
        {
            string fullViewPath = Path.Combine(folderPath, viewName);
            XmlDocument xmlDoc = new XmlDocument();
            xmlDoc.Load(fullViewPath);

            //setup namespace table
            nsmgr = new XmlNamespaceManager(xmlDoc.NameTable);
            nsmgr.AddNamespace("xd", "http://schemas.microsoft.com/office/infopath/2003");
            nsmgr.AddNamespace("xsl", "http://www.w3.org/1999/XSL/Transform");

            return xmlDoc;
        }

        private static void AddMigrationInfo(List<MigrationAnalysisInfo> migrationInfos, string issueLevel, string description, XmlNodeList nodeList)
        {
            if (nodeList.Count == 0)
            {
                return;
            }

            migrationInfos = migrationInfos ?? new List<MigrationAnalysisInfo>();

            migrationInfos.Add(new MigrationAnalysisInfo(issueLevel, description, nodeList.Count));
        }

        public static List<DetailingResult> GetDetailingResults(XsnWrapper xsnWrapper)
        {
            byte[] templateBytes = GetFileBytes(GetTemplate(xsnWrapper.FolderPath));

            XmlDocument questions = new XmlDocument();

            using (var stream = GetEmbeddedResourceStream("DetailingMetrics.xml"))
            {
                using (var sr = new StreamReader(stream))
                {
                    using (XmlReader transReader = XmlReader.Create(sr))
                    {
                        questions.Load(transReader);
                    }
                }
            }

            var xpaths = BuildXPathSet();
            var executor = new TemplateInspectionExecutor(questions, xpaths);
            var detResult = executor.RunOperations(templateBytes);

            XmlNodeList results = detResult.SelectNodes("/Results/Result");
            List<DetailingResult> resultList = new List<DetailingResult>();

            foreach (XmlNode result in results)
            {
                DetailingResult res = new DetailingResult(result.SelectSingleNode("OperationCode").InnerText,
                    result.SelectSingleNode("ResultLevel").InnerText, result.SelectSingleNode("ResultMessage").InnerText);
                resultList.Add(res);

            }

            return resultList;
        }

        private static CloudBlockBlob GetBlob(string containerName, string fileName)
        {
            CloudBlockBlob blob = null;
#if RUN_IN_AZURE
            string connectionString = CloudConfigurationManager.GetSetting("StorageConnectionString");
            CloudStorageAccount storageAccount = CloudStorageAccount.Parse(connectionString);
            CloudBlobClient blobClient = storageAccount.CreateCloudBlobClient();
            CloudBlobContainer container = blobClient.GetContainerReference(containerName);
            blob = container.GetBlockBlobReference(fileName);
#else
            blob = new CloudBlockBlob(containerName, fileName);
#endif
            return blob;
        }
        private static string GetTemplate(string folderPath)
        {
            string templateName = Path.Combine(folderPath, DateTime.Now.ToString("yyyymmDDHHmmss") + ".xsn");
            CabInfo cab = new CabInfo(templateName);
            cab.Pack(folderPath);
            return templateName;
        }

        private static byte[] GetFileBytes(string fileName)
        {
            byte[] fileBytes;
            using (Stream str = System.IO.File.OpenRead(fileName))
            {
                fileBytes = new byte[str.Length];
                str.Read(fileBytes, 0, (int)str.Length);
            }
            return fileBytes;
        }

        private static TemplateInspectionXPathSet BuildXPathSet()
        {
            TemplateInspectionXPathSet xpaths = new TemplateInspectionXPathSet();

            xpaths.OperationPath = "/my:DetailingQuestions/my:Questions/my:Question[my:Type = 'Auto']";
            xpaths.OperationCode = "my:Title";
            xpaths.ActionPath = "my:Auto/my:Actions/my:Action";
            xpaths.AssertionPath = "my:Auto/my:Assertions/my:Assertion";

            var actionPaths = xpaths.ActionPaths;
            actionPaths.ResultVariableName = "my:VariableName";
            actionPaths.ResultType = "my:ResultType";
            actionPaths.TemplateFile = "my:TemplateFile";
            actionPaths.XPath = "my:XPath";

            var assertionPaths = xpaths.AssertionPaths;
            assertionPaths.XPath = "my:XPath";
            assertionPaths.ResultLevel = "my:Result/my:ResultLevel";
            assertionPaths.ResultMessage = "my:Result/my:ResultMessage";
            assertionPaths.ResultMessageIsFormula = "my:Result/my:ResultMessageIsFormula";

            var defaultsPaths = xpaths.DefaultsPaths;
            defaultsPaths.ResultLevel = "my:Auto/my:DefaultResult/my:Result/my:ResultLevel";
            defaultsPaths.ResultMessage = "my:Auto/my:DefaultResult/my:Result/my:ResultMessage";
            defaultsPaths.ResultMessageIsFormula = "my:Auto/my:DefaultResult/my:Result/my:ResultMessageIsFormula";

            // Result code mapping values
            xpaths.GoodCode = "Good";
            xpaths.BadCode = "Bad";
            xpaths.OKCode = "OK";

            // XPath result type mapping values
            actionPaths.BooleanCode = "boolean";
            actionPaths.NodeSetCode = "nodeset";
            actionPaths.NumericCode = "number";
            actionPaths.StringCode = "string";

            return xpaths;
        }

        public static List<DllInfo> GetDllInfos(XsnWrapper xsnWrapper)
        {
            List<DllInfo> dllInfos = new List<DllInfo>();

            //for each, name and length
            foreach (string file in xsnWrapper.XsnContents)
            {
                if (Path.GetExtension(file) == ".dll")
                {
                    dllInfos.Add(new DllInfo(Path.GetFileNameWithoutExtension(file), Utilities.GetSizeOfFile(file), FileVersionInfo.GetVersionInfo(file).FileVersion));
                }
            }

            return dllInfos;
        }

        public static FormInformation GenerateFormInformation(XsnWrapper xsnWrapper)
        {
            FormInformation formInfo = new FormInformation();

            formInfo.ViewInfos = GetViewInfos(xsnWrapper);
            formInfo.DataConnections = xsnWrapper.Manifest.GetAllDataConnectionInfo();
            formInfo.FormProperties = xsnWrapper.GetAllXsnProperties();
            formInfo.PromotedProperties = xsnWrapper.Manifest.GetAllPromotedProperties();
            formInfo.DllInfos = GetDllInfos(xsnWrapper);
            formInfo.DetailingResults = GetDetailingResults(xsnWrapper);
            formInfo.MigrationAnalysisInfos = GetFormAnalysisInfos(xsnWrapper);
            formInfo.MigrationAnalysisInfos = xsnWrapper.AddRepeatingStructureWithSiblingsInfo(formInfo.MigrationAnalysisInfos);
            //formInfo.MigrationAnalysisInfos = xsnWrapper.Manifest.GetDataConnectionInfo(formInfo.MigrationAnalysisInfos);
            formInfo.QRulesInfos = xsnWrapper.Manifest.GetAllQRules();

            //TODO: Allow turning off getting form Level info
            AddFormLevelInformation(xsnWrapper, formInfo);

            return formInfo;
        }

        private static void AddFormLevelInformation(XsnWrapper xsnWrapper, FormInformation formInfo)
        {
            FormLevelInfo formLevel = new FormLevelInfo();

            //xml for the form info
            XmlSerializer serializer = new XmlSerializer(typeof(FormInformation));
            StringWriter writer = new StringWriter();
            serializer.Serialize(writer, formInfo);
            string xml = writer.ToString();

            XmlDocument doc = new XmlDocument();
            doc.LoadXml(xml);
            XPathNavigator formInfoNavigator = doc.CreateNavigator();

            //xml for the form level requirements
            XmlDocument fldoc = new XmlDocument();

            using (var stream = GetEmbeddedResourceStream("FormLevels.xml"))
            {
                using (var sr = new StreamReader(stream))
                {
                    using (XmlReader transReader = XmlReader.Create(sr))
                    {
                        fldoc.Load(transReader);
                    }
                }
            }

            XPathNavigator flNavigator = fldoc.CreateNavigator();

            //get levels
            XPathNodeIterator levels = flNavigator.Select("FormLevels/FormLevel");

            //loop through levels - if any expression evaluates false for a level, move to the next level.
            foreach (XPathNavigator level in levels)
            {
                //loop through Requirements
                XPathNodeIterator requirements = level.Select("Requirements/Requirement[Expression != '']");
                foreach (XPathNavigator requirement in requirements)
                {
                    XPathExpression expression = formInfoNavigator.Compile(requirement.SelectSingleNode("Expression").Value);
                    bool success = (bool)formInfoNavigator.Evaluate(expression);
                    requirement.SelectSingleNode("Result").SetValue(success.ToString().ToLower());

                    if (success)
                        formLevel.Level = level.SelectSingleNode("@name").Value;
                }

            }

            //add qualifiers and recommendations for level
            XPathNodeIterator qualifiers = flNavigator.Select(string.Format("FormLevels/FormLevel[@name = '{0}']/Requirements/Requirement[Result = 'true' or @alwaysInclude = 'true']/Description", formLevel.Level));
            formLevel.Qualifiers = new List<Qualifier>();
            foreach (XPathNavigator qualifier in qualifiers)
            {
                formLevel.Qualifiers.Add(new Qualifier(qualifier.Value));
            }

            XPathNodeIterator recommendations = flNavigator.Select(string.Format("FormLevels/FormLevel[@name = '{0}']/Recommendations/Recommendation", formLevel.Level));
            formLevel.Recommendations = new List<Recommendation>();
            foreach (XPathNavigator recommendation in recommendations)
            {
                formLevel.Recommendations.Add(new Recommendation(recommendation.Value));
            }

            formInfo.FormLevel = formLevel;

        }

        private static Dictionary<string, string> ExtensionTypes = new Dictionary<string, string>
        {
            {".jpg", "image/jpeg"},
            {".jpeg", "image/jpeg"},
            {".bmp", "image/bmp"},
            {".gif", "image/gif"},
            {".png", "image/png"},
            {".tiff", "image/tiff"},
            {".css", "text/css"},
            {".js", "application/javascript"}
        };


        public static string GetContentType(string fileName, string defaultContentType = "image/png")
        {
            var extension = Path.GetExtension(fileName);

            string contentType;

            if (extension != null && ExtensionTypes.TryGetValue(extension, out contentType))
            {
                return contentType;
            }

            return defaultContentType;
        }

        public static Dictionary<string, string> GenerateParameterDictionary(string paramNames, string paramValues)
        {

            if (paramNames == null || paramValues == null)
                return null;

            List<string> names = paramNames.Split(',').ToList<string>();
            List<string> values = paramValues.Split(',').ToList<string>();

            Dictionary<string, string> parameters = names.ToDictionary(x => x, x => values[names.IndexOf(x)]);

            return parameters;
        }
    }
}
