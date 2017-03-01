using System.Web;
using System.Web.Optimization;

namespace QFSWeb
{
    public class BundleConfig
    {
        // For more information on bundling, visit http://go.microsoft.com/fwlink/?LinkId=301862
        public static void RegisterBundles(BundleCollection bundles)
        {
            var jQueryScripts = new[] { "~/Scripts/jquery-{version}.js" };

            bundles.Add(new ScriptBundle("~/bundles/jquery.js")
                .Include(jQueryScripts));

            bundles.Add(new ScriptBundle("~/bundles/uiLoader.js").Include(
                        "~/Scripts/Qd/FormsViewer/UI/uiLoader.js"));

            bundles.Add(new ScriptBundle("~/bundles/formsViewerBase.js").Include(
                        "~/Scripts/Qd/FormsViewer/polyfills.js",
                        //"~/Scripts/MicrosoftAjax.js",
                        //"~/Scripts/jquery-1.10.2.min.js",
                        //"~/Scripts/Libraries/q.js",
                        "~/Scripts/xpath.js",
                        "~/Scripts/util.js",
//                        "~/Scripts/Qd/shpScriptLoader.js",
                        "~/Scripts/app.js",
                        "~/Scripts/Qd/FormsViewer/UI/uiLoader.js"
                ));

            bundles.Add(new Bundle("~/bundles/CkEditor.js")
                .Include("~/Scripts/CkEditor/ckeditor.js",
                "~/Scripts/CkEditor/config.js",
                "~/Scripts/CkEditor/styles.js",
                "~/Scripts/CkEditor/styles.js"));

            bundles.Add(new StyleBundle("~/bundles/CkEditor.css")
                .Include("~/Scripts/CkEditor/skins/bootstrapck/editor.css",
                "~/Scripts/CkEditor/contents.css"));

            bundles.Add(new ScriptBundle("~/bundles/dropzonescripts").Include(
                     "~/Scripts/dropzone/dropzone.js"));

            bundles.Add(new StyleBundle("~/bundles/dropzonescss").Include(
                     "~/Scripts/dropzone/basic.css",
                     "~/Scripts/dropzone/dropzone.css"));

            bundles.Add(new ScriptBundle("~/bundles/formsViewer.js").Include(
                        "~/Scripts/Libraries/jquery.autosize.min.js",
                        "~/Scripts/Libraries/utf8.js",
                        "~/Scripts/jquery-ui.js",
                        "~/Scripts/string.js",
                        "~/Scripts/xregexp-min.js",
                        "~/Scripts/AJAXSLT/xslt.js",
                        "~/Scripts/Manifest/formsviewer.domain.js",
                        "~/Scripts/Manifest/manifest.parser.js",
                        "~/Scripts/sharePointAccess.js",
                        "~/Scripts/formsviewer.xpath.js",
                        "~/Scripts/Qd/xmlUtility.js",
                        "~/Scripts/Libraries/virtual-dom.js",
                        "~/Scripts/Libraries/qd.xslt.min.js",
                        "~/Scripts/Libraries/filesaver.js",
                        "~/Scripts/Qd/qfsAccess.js",
                        "~/Scripts/Qd/FormsViewer/domNode.js",
                        "~/Scripts/Qd/FormsViewer/template.js",
                        "~/Scripts/Qd/FormsViewer/loader.js",
                        "~/Scripts/Qd/FormsViewer/Controls/attachmentClickHandler.js",

                        "~/Scripts/Qd/FormsViewer/UI/asyncDialog.js",
                        "~/Scripts/Qd/FormsViewer/UI/failureDialog.js",
                        "~/Scripts/Qd/FormsViewer/UI/fileActionDialog.js",
                        "~/Scripts/Qd/FormsViewer/UI/messageBox.js",
                        "~/Scripts/Qd/FormsViewer/UI/fileDialog.js",
                        "~/Scripts/Qd/FormsViewer/UI/formCloser.js",
                        "~/Scripts/Qd/FormsViewer/UI/peopleSelector.js",
                        "~/Scripts/Qd/FormsViewer/UI/ui.js",


                        "~/Scripts/Qd/FormsViewer/constants.js",
                        "~/Scripts/Qd/FormsViewer/domNodeMap.js",
                // needs to be included before other data connection files
                        "~/Scripts/Qd/FormsViewer/DataConnections/utils.js",
                        "~/Scripts/Qd/FormsViewer/DataConnections/dataConnectionCollection.js",
                        "~/Scripts/Qd/FormsViewer/DataConnections/dataConnectionFactory.js",
                        "~/Scripts/Qd/FormsViewer/DataConnections/sharePointListAdapter.js",
                        "~/Scripts/Qd/FormsViewer/DataConnections/sharePointSubmitAdapter.js",
                        "~/Scripts/Qd/FormsViewer/DataConnections/udcxFileAdapter.js",
                        "~/Scripts/Qd/FormsViewer/DataConnections/soapAdapter.js",
                        "~/Scripts/Qd/FormsViewer/DataConnections/xmlFileAdapter.js",
                        "~/Scripts/Qd/FormsViewer/DataConnections/adoAdapter.js",
                        "~/Scripts/Qd/FormsViewer/DataConnections/soap/jquery.soap.js",
                        "~/Scripts/Qd/FormsViewer/DataConnections/soap/jquery.doedje.xml2json.js",
                        "~/Scripts/Qd/FormsViewer/DataSources/dataSource.js",
                        "~/Scripts/Qd/FormsViewer/DataSources/dataSourceCollection.js",
                        "~/Scripts/Qd/FormsViewer/DataSources/dataSourceNode.js",
                        "~/Scripts/Qd/FormsViewer/DataSources/defaultValueApplicator.js",
                        "~/Scripts/Qd/FormsViewer/DataSources/fieldChangeListener.js",
                        "~/Scripts/Qd/FormsViewer/DataSources/fieldChangeRuleExecutor.js",
                        "~/Scripts/Qd/FormsViewer/nodeId.js",
                        "~/Scripts/Qd/FormsViewer/Rules/actionExecutor.js",
                        "~/Scripts/Qd/FormsViewer/Rules/ruleExecutor.js",
                        "~/Scripts/Qd/FormsViewer/Rules/ruleSetExecutor.js",

                        "~/Scripts/Qd/FormsViewer/richTextManager.js",
                        "~/Scripts/Qd/FormsViewer/viewManager.js",
                        "~/Scripts/Qd/FormsViewer/viewWatcher.js",
                        "~/Scripts/Qd/FormsViewer/peoplePickerManager.js",
                        "~/Scripts/Qd/FormsViewer/widgetManager.js",
                        "~/Scripts/Qd/FormsViewer/xmlActionExecutor.js",
                        "~/Scripts/Qd/FormsViewer/engine.js",
                        "~/Scripts/Qd/FormsViewer/objectModel.js",
                        "~/Scripts/viewform.js",
                        "~/Scripts/select2/select2.js"
                        ));

            bundles.Add(new ScriptBundle("~/bundles/qRules.js").Include(
                        "~/Scripts/Qd/FormsViewer/qRules/qRules.js",

                        "~/Scripts/Qd/FormsViewer/qRules/webServiceWrapper.js",
                        "~/Scripts/Qd/FormsViewer/qRules/getUserInfoWrapper.js",
                        "~/Scripts/Qd/FormsViewer/qRules/getDocumentWrapper.js",
                        "~/Scripts/Qd/FormsViewer/qRules/submitDocumentWrapper.js",

                        "~/Scripts/Qd/FormsViewer/qRules/jsonXmlConvert.js",
                        "~/Scripts/Qd/FormsViewer/qRules/AssignDocument.js",
                        "~/Scripts/Qd/FormsViewer/qRules/ChangeConnectionUrl.js",
                        "~/Scripts/Qd/FormsViewer/qRules/ChangeSubmitUrl.js",
                        "~/Scripts/Qd/FormsViewer/qRules/CopyRichText.js",
                        "~/Scripts/Qd/FormsViewer/qRules/CopyMove.js",
                        "~/Scripts/Qd/FormsViewer/qRules/Encrypt.js",
                        "~/Scripts/Qd/FormsViewer/qRules/Decrypt.js",
                        "~/Scripts/Qd/FormsViewer/qRules/CopyTable.js",
                        "~/Scripts/Qd/FormsViewer/qRules/DateAdd.js",
                        "~/Scripts/Qd/FormsViewer/qRules/DateDiff.js",
                        "~/Scripts/Qd/FormsViewer/qRules/Delete.js",
                        "~/Scripts/Qd/FormsViewer/qRules/DeleteFromSharePoint.js",
                        "~/Scripts/Qd/FormsViewer/qRules/DelimitedList.js",
                        "~/Scripts/Qd/FormsViewer/qRules/Encode.js",
                        "~/Scripts/Qd/FormsViewer/qRules/ExecuteSqlQuery.js",
                        "~/Scripts/Qd/FormsViewer/qRules/GenerateGuid.js",
                        "~/Scripts/Qd/FormsViewer/qRules/GetFormProperty.js",
                        "~/Scripts/Qd/FormsViewer/qRules/GetInputParameter.js",
                        "~/Scripts/Qd/FormsViewer/qRules/GetUserProfileByName.js",
                        "~/Scripts/Qd/FormsViewer/qRules/GetListGuid.js",
                        "~/Scripts/Qd/FormsViewer/qRules/GetValue.js",
                        "~/Scripts/Qd/FormsViewer/qRules/GetWeekDay.js",
                        "~/Scripts/Qd/FormsViewer/qRules/GetXml.js",
                        "~/Scripts/Qd/FormsViewer/qRules/FormatNumber.js",
                        "~/Scripts/Qd/FormsViewer/qRules/Insert.js",
                        "~/Scripts/Qd/FormsViewer/qRules/InsertPi.js",
                        "~/Scripts/Qd/FormsViewer/qRules/LoadResource.js",
                        "~/Scripts/Qd/FormsViewer/qRules/ModifySqlQuery.js",
                        "~/Scripts/Qd/FormsViewer/qRules/MakeRequest.js",
                        "~/Scripts/Qd/FormsViewer/qRules/JsonToXml.js",
                        "~/Scripts/Qd/FormsViewer/qRules/RefreshSharePointListItems.js",
                        "~/Scripts/Qd/FormsViewer/qRules/RemovePi.js",
                        "~/Scripts/Qd/FormsViewer/qRules/RemoveDbxlPi.js",
                        "~/Scripts/Qd/FormsViewer/qRules/ReplaceString.js",
                        "~/Scripts/Qd/FormsViewer/qRules/SaveToDbxl.js",
                        "~/Scripts/Qd/FormsViewer/qRules/SaveToSharePoint.js",
                        "~/Scripts/Qd/FormsViewer/qRules/SetCase.js",
                        "~/Scripts/Qd/FormsViewer/qRules/SetDefaultView.js",
                        "~/Scripts/Qd/FormsViewer/qRules/SetValue.js",
                        "~/Scripts/Qd/FormsViewer/qRules/SetXml.js",
                        "~/Scripts/Qd/FormsViewer/qRules/SortTable.js",
                        "~/Scripts/Qd/FormsViewer/qRules/SubmitToDbxl.js",
                        "~/Scripts/Qd/FormsViewer/qRules/SubmitToSharePoint.js",
                        "~/Scripts/Qd/FormsViewer/qRules/SubmitToSharePointList.js",
                        "~/Scripts/Qd/FormsViewer/qRules/SwapDomWithDocument.js",
                        "~/Scripts/Qd/FormsViewer/qRules/Transform.js",
                        "~/Scripts/Qd/FormsViewer/qRules/XmlToJson.js"
                        ));

            // Use the development version of Modernizr to develop with and learn from. Then, when you're
            // ready for production, use the build tool at http://modernizr.com to pick only the tests you need.
            bundles.Add(new ScriptBundle("~/bundles/modernizr.js").Include(
                        "~/Scripts/modernizr-*"));

            bundles.Add(new ScriptBundle("~/bundles/bootstrap.js").Include(
                      "~/Scripts/bootstrap.js",
                      "~/Scripts/respond.js"));

            bundles.Add(new ScriptBundle("~/bundles/spcontext.js").Include(
                        "~/Scripts/spcontext.js"));

            bundles.Add(new ScriptBundle("~/bundles/formDigestInfo.js").Include(
                        "~/Scripts/Libraries/SP.FormDigestInfo.js"));


            bundles.Add(new ScriptBundle("~/bundles/uploadTemplate.js").Include(
                        "~/Scripts/PageScripts/uploadTemplate.js"));

            bundles.Add(new StyleBundle("~/Content/css").Include(
                      "~/Content/bootstrap-theme.css",
                      "~/Content/site.css"));

            bundles.Add(new StyleBundle("~/Content/jquery-ui").Include(
                ));

            BundleTable.EnableOptimizations =
#if DEBUG
 false
#else
                true
#endif
;
        }
    }
}
