using QFSWeb.Models;
using System;
using System.Collections.Generic;
using System.Data.Objects;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using QFSWeb.Utilities;
using System.Globalization;
using QFSWeb.Interface;
using System.Security.Cryptography;
using System.Text;
using System.IO;
using System.Net.Http.Formatting;
using QFSWeb.Encryption;
using QFSWeb.Models.ViewModels;
using System.Net;
using QFSWeb.Filters;

namespace QFSWeb.Controllers
{
    public class FormsViewerController : Controller
    {
        private IStorageHelper StorageContext;

        public FormsViewerController(IStorageHelper storageHelper)
        {
            StorageContext = storageHelper;
        }

        // Validates, caches key and redirects to javascript page
        [SharePointContextFilter]
        public async Task<ActionResult> Index()
        {
            var isUsageExceeded = (await CheckIsUsageExceededAsync()).Item3;

            using (var context = SpManager.GetSharePointContext(HttpContext))
            {
                return View(new IndexViewModel
                {
                    IsAdmin = SpManager.IsUserAdmin(context),
                    Version = QfsUtility.InternalGetQFSVersion(),
                    IsUsageExceeded = isUsageExceeded
                });
            }
        }

        [SharePointContextFilter]
        [ActionName("View")]
        public async Task<ActionResult> ViewForm(string templateName)
        {
            var userKey = GetUserKey();

            if (DbManager.EnableLimiting)
            {
                await DbManager.EnsureUserRecord(userKey);
                await DbManager.AddUsage(userKey);
            }

            InitClientContext();
            return View();
        }

        private void InitClientContext()
        {
            try
            {
                using (var clientContext = SpManager.GetSharePointContext(HttpContext))
                {

                }
            }
            catch (Exception e)
            {
                throw;
            }
        }

        private ActionResult RedirectToDefaultView()
        {
            string qs = "";
            int indexOfQuestionMark = this.Request.RawUrl.IndexOf("?");
            if (indexOfQuestionMark >= 0)
                qs = this.Request.RawUrl.Substring(indexOfQuestionMark);

            return Redirect("/Pages/Default.aspx" + qs);
        }

        [SharePointContextFilter]
        public ActionResult Open()
        {
            var spContext = SharePointContextProvider.Current.GetSharePointContext(System.Web.HttpContext.Current);
            Guid listId = new Guid(this.Request["SPListId"]);
            int itemId = 0;
            var errorModel = new ErrorModel
            {
                ErrorMessage = "Please select a document to open."
            };

            if (!Int32.TryParse(Convert.ToString(Request["SPListItemId"]), out itemId))
            {
                return View("ErrorView", errorModel);
            }

            string itemServerRelativeUrl = null;
            string itemFullUrl = "";
            var itemContentTypeId = "";

            using (var clientContext = spContext.CreateUserClientContextForSPHost())
            {
                var web = clientContext.Web;
                clientContext.Load(web);
                var spList = clientContext.Web.Lists.GetById(listId);
                clientContext.Load(spList);
                var item = spList.GetItemById(itemId);
                clientContext.Load(item);
                clientContext.Load(item.ContentType);
                clientContext.ExecuteQuery();

                itemContentTypeId = item.ContentType.StringId;
                itemServerRelativeUrl = item["FileRef"].ToString();
                Uri rootUri = new Uri(clientContext.Web.Url);
                string root = rootUri.GetComponents(UriComponents.SchemeAndServer, UriFormat.Unescaped);
                itemFullUrl = root + itemServerRelativeUrl;
            }

            if (itemContentTypeId.StartsWith("0x0120"))
            {
                errorModel.ErrorMessage = "Please select a valid document to open.";
                return View("ErrorView", errorModel);
            }

            return RedirectToView(itemFullUrl);
        }

        private ActionResult RedirectToView(string url)
        {
            string qs = "";
            int indexOfQuestionMark = this.Request.RawUrl.IndexOf("?");
            if (indexOfQuestionMark >= 0)
            {
                qs = this.Request.RawUrl.Substring(indexOfQuestionMark);
            }
            else
            {
                qs = "?";
            }
            if (string.IsNullOrEmpty(url))
                return RedirectToDefaultView();

            var urlType = url.EndsWith(".xsn")
                ? "template"
                : "document";

            return Redirect(String.Format("/FormsViewer/View{0}&{1}={2}", qs, urlType, url));
        }

        [SharePointContextFilter]
        public ActionResult Manage()
        {
            return View();
        }

        [SharePointContextFilter]
        public ActionResult InstanceList()
        {
            //var appInstances = CredentialManager.GetAppInstances(GetUserKey());
            var appInstances = SqlCredentialManager.GetAppInstances(GetUserKey());
            return PartialView(appInstances);
        }

        [SharePointContextFilter]
        public ActionResult Instance(string instanceId)
        {
            var appInstance = String.IsNullOrWhiteSpace(instanceId)
                ? new AppInstance()
                : SqlCredentialManager.GetAppInstanceById(instanceId, GetUserKey());
            //: CredentialManager.GetAppInstanceById(instanceId, GetUserKey());

            appInstance = appInstance ?? new AppInstance();

            return PartialView(appInstance);
        }

        [HttpPost]
        [SharePointContextFilter]
        public async Task<ActionResult> Instance(AppInstance instance)
        {
            var isInstanceExists = await SqlCredentialManager.IsAppInstanceExistAsync(instance, GetUserKey());
            if (isInstanceExists)
            {
                return Json(new { Result = false, Exists = isInstanceExists });
            }

            var operationResult = SqlCredentialManager.SaveOrUpdateAppInstance(instance, GetUserKey());

            return Json(new { Result = operationResult });
        }

        public ActionResult NewGuid(string format)
        {
            return Json(Guid.NewGuid().ToString(format), JsonRequestBehavior.AllowGet);
        }

        private static string GetUserKey()
        {
            return SpManager.GetRealm();
        }

        [HttpGet]
        [SharePointContextFilter]
        public ActionResult UploadTemplate(string formName, bool update = false)
        {
            using (var context = SpManager.GetSharePointContext(HttpContext))
            {
                if (!SpManager.IsUserAdmin(context))
                {
                    return AccessDenied();
                }

                return View(new UploadTemplateViewModel
                {
                    CreateNew = !update,
                    FormName = formName
                });
            }
        }

        private static string UploadedMessage(bool update)
        {
            return update
                ? "Your template has been successfully updated."
                : "Your template has been successfully added.";
        }

        [HttpPost]
        [SharePointContextFilter]
        public async Task<ActionResult> UploadTemplate(string formName, string location, bool update = false, bool allowDowngrade = false)
        {
            using (var context = SpManager.GetSharePointContext(HttpContext))
            {
                if (!SpManager.IsUserAdmin(context))
                {
                    return AccessDenied();
                }

                if (!string.IsNullOrWhiteSpace(formName) && Request.Files.Count > 0)
                {
                    location = QfsUtility.FormatLocation(location);

                    if (!update && string.IsNullOrWhiteSpace(location))
                    {
                        return Json(new UploadTemplateViewModel
                        {
                            CreateNew = true,
                            FormName = formName,
                            Message = "Cannot add template, location is missing"
                        });
                    }

                    try
                    {
                        var template = Request.Files[0];
                        var realm = GetUserKey();

                        context.Load(context.Web);
                        context.ExecuteQuery();

                        context.Load(context.Web.CurrentUser);
                        context.ExecuteQuery();
                        var currentUser = context.Web.CurrentUser.Title;

                        var tuple = await SQLTemplateStorageManager.StoreTemplate(realm, formName, !update, template.InputStream,
                            template.FileName, allowDowngrade, StorageContext, currentUser, location);

                        return Json(new UploadTemplateViewModel
                        {
                            HideContent = true,
                            Message = UploadedMessage(update),
                            IsUploaded = tuple.Item1,
                            OldVersion = tuple.Item2,
                            NewVersion = tuple.Item3
                        });
                    }
                    catch (Exception e)
                    {
                        return Json(new UploadTemplateViewModel
                        {
                            CreateNew = !update,
                            FormName = formName,
                            Message = e.Message
#if DEBUG
,
                            Stack = e.StackTrace
#endif
                        });
                    }
                }
                else
                {
                    return UploadTemplate(formName, update);
                }
            }
        }

        [SharePointContextFilter]
        [NoCacheAction]
        public async Task<ActionResult> ManageTemplates()
        {
            try
            {
                var checkUsageCountData = await CheckIsUsageExceededAsync();
                var location = checkUsageCountData.Item1;
                var monthlyFormOpenCount = checkUsageCountData.Item2;
                var isUsageExceeded = checkUsageCountData.Item3;

                using (var context = SpManager.GetSharePointContext(HttpContext))
                {
                    if (!SpManager.IsUserAdmin(context))
                    {
                        return AccessDenied();
                    }

                    var templates = await GetTemplatesAsync();

                    return View(new ManageTemplatesViewModel
                    {
                        Templates = templates,
                        MonthlyFormOpenCount = monthlyFormOpenCount,
                        Location = location,
                        IsUsageExceeded = isUsageExceeded
                    });
                }
            }
            catch (Exception e)
            {
                throw QfsUtility.HandleException(e);
            }
        }

        private static async Task<IEnumerable<FormTemplateViewModel>> GetTemplatesAsync(string userKey = null)
        {
            userKey = userKey ?? GetUserKey();

            var listTemplateModel = await SQLTemplateStorageManager.GetTemplatesAsync(userKey);
            var templates = listTemplateModel
                .OrderBy(t => t.TemplateName);

            return templates;
        }

        [SharePointContextFilter]
        public async Task<ActionResult> ManageHrefs()
        {
            try
            {
                using (var context = SpManager.GetSharePointContext(HttpContext))
                {
                    if (!SpManager.IsUserAdmin(context))
                    {
                        return AccessDenied();
                    }

                    var userKey = GetUserKey();
                    var templates = await GetTemplatesAsync(userKey);

                    var hrefs = (await SQLTemplateStorageManager.ListHrefAssociations(userKey)).ToList();

                    return View(new ManageHrefsModel
                    {
                        Hrefs = hrefs,
                        Templates = templates
                    });
                }
            }
            catch (Exception e)
            {
                throw QfsUtility.HandleException(e);
            }
        }

        [SharePointContextFilter]
        public async Task<ActionResult> SaveHrefs(IEnumerable<HrefAssociation> newHrefs, IEnumerable<HrefAssociation> updateHrefs)
        {
            try
            {
                using (var context = SpManager.GetSharePointContext(HttpContext))
                {
                    if (!SpManager.IsUserAdmin(context))
                    {
                        return AccessDenied();
                    }

                    var userKey = GetUserKey();

                    await SQLTemplateStorageManager.SaveNewHrefAssociations(userKey, newHrefs ?? Enumerable.Empty<HrefAssociation>());

                    await SQLTemplateStorageManager.UpdateHrefAssociations(userKey, updateHrefs ?? Enumerable.Empty<HrefAssociation>());
                }
            }
            catch (Exception e)
            {
                return Json(e.StackTrace);
            }

            return Json(new { success = true });
        }


        private ActionResult AccessDenied()
        {
            return View("AccessDenied");
        }

        public async Task<ActionResult> DeleteInstance(string instanceId)
        {
            if (String.IsNullOrWhiteSpace(instanceId))
            {
                return new HttpStatusCodeResult(System.Net.HttpStatusCode.BadRequest);
            }

            var instanceDeleteResult = await SqlCredentialManager.DeleteAppInstance(instanceId, GetUserKey());

            //var instanceDeleteResult = await CredentialManager.DeleteAppInstance(instanceId, GetUserKey());

            return Json(new { Result = instanceDeleteResult }, JsonRequestBehavior.AllowGet);
        }

        private static CultureInfo GetCulture(string cultureName, out string errorMsg)
        {
            errorMsg = string.Empty;
            try
            {
                if (string.IsNullOrEmpty(cultureName))
                {
                    return CultureInfo.CurrentCulture;
                }
                else
                {
                    return new CultureInfo(cultureName);
                }

            }
            catch (Exception)
            {
                errorMsg = String.Format("{0} is not a valid culture name", cultureName);
                return null;
            }
        }

        private object GetResponse(bool success = true, string data = null, string error = null)
        {
            return new
            {
                Success = success,
                Data = data,
                Error = error
            };
        }

        [SharePointContextFilter]
        public ActionResult FormatNumber(FormatNumberSettings settings)
        {
            string errorMsg;
            CultureInfo culture = GetCulture(settings.culture, out errorMsg);

            if (culture == null)
            {
                return Json(GetResponse(success: false, error: errorMsg), JsonRequestBehavior.AllowGet);
            }

            try
            {
                return Json(GetResponse(data: settings.numberToFormat.ToString(settings.format, culture)), JsonRequestBehavior.AllowGet);
            }
            catch (FormatException)
            {
                int numberAsInt = Int32.Parse(settings.numberToFormat.ToString());

                return Json(GetResponse(data: numberAsInt.ToString(settings.format, culture)), JsonRequestBehavior.AllowGet);
            }
            catch (Exception)
            {
                return Json(GetResponse(success: false, error: "Unable to format number."), JsonRequestBehavior.AllowGet);
            }
        }

        [SharePointContextFilter]
        [HttpPost]
        [ValidateInput(false)]
        public ActionResult Encrypt(string data, string password, bool pad)
        {
            try
            {
                string encryptedData = Commands.EncryptString(Commands.AddPrefix(data, false), password);
                if (pad)
                {
                    encryptedData = Commands.AddPrefix(encryptedData, true);
                    encryptedData = Commands.PadData(encryptedData);
                }

                return Json(GetResponse(data: encryptedData), JsonRequestBehavior.AllowGet);
            }
            catch (Exception)
            {
                return Json(GetResponse(success: false, error: "Unable to encrypt text."), JsonRequestBehavior.AllowGet);
            }
        }

        private const string ENCRYPTED_PREFIX = "qdEncrypted";

        [SharePointContextFilter]
        [HttpPost]
        [ValidateInput(false)]
        public ActionResult Decrypt(string data, string password)
        {
            try
            {
                if (data.StartsWith(ENCRYPTED_PREFIX))
                {
                    data = Commands.RemovePrefix(data, true);
                    data = Commands.UnpadData(data);
                }
                string decryptedData = Commands.DecryptString(data, password);

                if (Commands.Decrypted(decryptedData))
                {
                    decryptedData = (Commands.RemovePrefix(decryptedData, false));
                }
                else
                {
                    return Json(GetResponse(success: false, error: "Unable to decrypt text."), JsonRequestBehavior.AllowGet);
                }

                return Json(GetResponse(data: decryptedData), JsonRequestBehavior.AllowGet);
            }
            catch (Exception)
            {
                return Json(GetResponse(success: false, error: "Unable to decrypt text."), JsonRequestBehavior.AllowGet);
            }
        }

        private static string GetCurrentLocation()
        {
            return QfsUtility.FormatLocation(SpManager.GetSpHost());
        }

        /// <summary>
        /// Method to check usage count.
        /// </summary>
        /// <returns></returns>
        private async static Task<Tuple<string, int, bool>> CheckIsUsageExceededAsync()
        {
            var location = GetCurrentLocation();
            var siteMonthlyOpenCount = await SQLTemplateStorageManager.GetSiteMonthlyFormOpenCountAsync(location);

            if (!ApplicationConstants.LocationAllowanceConstant.EnableLicensing)
            {
                return new Tuple<string, int, bool>(location, siteMonthlyOpenCount, false);
            }

            var maxMonthlyOpenCount = ApplicationConstants.LocationAllowanceConstant.DefaultMonthlyOpenCount;
            if (siteMonthlyOpenCount <= maxMonthlyOpenCount)
            {
                return new Tuple<string, int, bool>(location, siteMonthlyOpenCount, false);
            }

            var currentDate = DateTime.UtcNow.Date;

            var isUsageExceeded = await SQLTemplateStorageManager.CheckIsUsageExceededAsync(location, currentDate, siteMonthlyOpenCount);

            return new Tuple<string, int, bool>(location, siteMonthlyOpenCount, isUsageExceeded);
        }

        [HttpGet]
        public async Task<ActionResult> ManageUsage()
        {
            var customers = new List<string>
            {
                null
            };

            customers.AddRange(await SQLTemplateStorageManager.GetCustomersListAsync());

            var customerModel = new BaseDropDownModel(customers, "customers", isPascal: true);

            var model = new ManageUsageModel
            {
                Customers = customerModel,
                FormCustomers = customerModel,
                SiteCustomers = customerModel
            };

            return View(model);
        }

        [HttpPost]
        public async Task<ActionResult> SearchSites(SearchSiteModel searchModel)
        {
            if (searchModel == null || String.IsNullOrWhiteSpace(searchModel.Query))
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }

            var date = DateTime.UtcNow;
            var listLocations = await SQLTemplateStorageManager.SearchSitesAsync(date, searchModel.Query,
                false, ApplicationConstants.LocationAllowanceConstant.DefaultMonthlyOpenCount);

            var model = new LocationsResultModel
            {
                IsExpired = false,
                Locations = listLocations
            };

            return PartialView("_SearchLocations", model);
        }

        [HttpPost]
        public async Task<ActionResult> SearchExpiredSites()
        {
            var date = DateTime.UtcNow;
            var listLocations = await SQLTemplateStorageManager.SearchSitesAsync(date, null,
                true, ApplicationConstants.LocationAllowanceConstant.DefaultMonthlyOpenCount);

            var model = new LocationsResultModel
            {
                IsExpired = true,
                Locations = listLocations
            };

            return PartialView("_SearchLocations", model);
        }

        [HttpGet]
        public async Task<ActionResult> LocationDetail(string location)
        {
            var date = DateTime.UtcNow;
            var monthlyUsage = await SQLTemplateStorageManager.GetMonthlyUsageDetailAsync(location, date);
            var license = await SQLTemplateStorageManager.GetLicenseAsync(location);

            var locationDetail = new LocationDetail
            {
                Usage = monthlyUsage,
                License = license
            };

            return View(locationDetail);
        }

        [HttpGet]
        public async Task<ActionResult> Licenses(string location)
        {
            if (String.IsNullOrWhiteSpace(location))
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest, "Location is required");
            }

            var license = await SQLTemplateStorageManager.GetLicenseAsync(location);

            return PartialView("_Licenses", license);
        }

        [HttpPost]
        public async Task<ActionResult> CreateLicense(LocationAllowance allowance)
        {
            if (allowance == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest, "Invalid license data cannot add license");
            }
            if (String.IsNullOrWhiteSpace(allowance.Location))
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest, "Location cannot be empty");
            }
            if (allowance.MonthlyOpens == 0)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest, "MonthlyOpens must be greater than 0");
            }
            if (!allowance.Expiration.HasValue ||
                allowance.Expiration.Value == DateTime.MinValue ||
                allowance.Expiration.Value.ToUniversalTime().Date < DateTime.UtcNow.Date)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest, "Invalid Expiration date");
            }

            await SQLTemplateStorageManager.InsertLicenseAsync(allowance);

            return Json(new { Success = true });
        }

        [HttpGet]
        public async Task<ActionResult> EditLicense(string location)
        {
            if (location == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest, "Location name cannot be empty");
            }

            var license = await SQLTemplateStorageManager.GetLicenseAsync(location);

            return PartialView("_CreateLicense", license);
        }

        [HttpGet]
        public async Task<JsonResult> CustomerData(string customer)
        {
            var customersData = await SQLTemplateStorageManager.GetCustomersDataAsync(customer);

            var customers = customersData.Select(c => c.Customer).OrderBy(c => c).Distinct();

            var months = customersData.Select(c => c.Date).OrderBy(d => d).Distinct().ToList();

            var results = months.Select(m =>
                new
                {
                    Date = new List<object> { m },
                    Opens = (from c in customers
                             let item = customersData.FirstOrDefault(cd => cd.Customer == c && cd.Date == m)
                             select item == null ? 0 : item.Opens).OfType<object>()
                }).ToList();

            results.ForEach(r =>
            {
                r.Date.AddRange(r.Opens);
            });

            var data = results.Select(r => r.Date).ToList();

            return Json(new
            {
                Customers = customers,
                Data = data
            }, JsonRequestBehavior.AllowGet);
        }

        public async Task<ActionResult> GetCustomerSites(string customer, bool isForm)
        {
            if (String.IsNullOrWhiteSpace(customer))
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }

            var customerSites = new List<string>
            {
                null
            };

            customerSites.AddRange(await SQLTemplateStorageManager.GetSitesByCustomerNameAsync(customer, isForm));

            var model = new BaseDropDownModel
            {
                DataList = customerSites,
                Item = null,
                ControlClass = "sites"
            };

            return PartialView("_DropDownDataSource", model);
        }

        [HttpGet]
        public async Task<ActionResult> CustomerInfo(string customer)
        {
            var customersData = await SQLTemplateStorageManager.GetCustomersDataAsync(customer);

            return PartialView("_CustomerInfo", customersData);
        }

        [HttpGet]
        public async Task<ActionResult> CustomerSitesData(string customer, string site, string type)
        {
            if (String.IsNullOrWhiteSpace(customer))
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }

            var siteData = await SQLTemplateStorageManager.GetCustomerSitesDataAsync(customer, site);

            object chartData = !String.IsNullOrWhiteSpace(type) && type == "C"
                ? GetCustomerSitesColumnData(siteData)
                : GetCustomerSitesPieData(siteData);

            return Json(chartData, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public async Task<ActionResult> SiteInfo(string customer, string site)
        {
            var siteData = await SQLTemplateStorageManager.GetCustomerSitesDataAsync(customer, site);

            return PartialView("_SiteInfo", siteData);
        }

        public async Task<ActionResult> GetSiteForms(string customer, string site)
        {
            if (String.IsNullOrWhiteSpace(site))
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }

            var customerSites = new List<string>
            {
                null
            };

            customerSites.AddRange(await SQLTemplateStorageManager.GetFormsBySiteAsync(customer, site));

            var model = new BaseDropDownModel
            {
                DataList = customerSites,
                Item = null,
                ControlClass = "forms"
            };

            return PartialView("_DropDownDataSource", model);
        }

        [HttpGet]
        public async Task<JsonResult> SiteFormsData(string customer, string site, string templateName, string type)
        {
            var siteData = await SQLTemplateStorageManager.GetSiteFormsDataAsync(customer, site, templateName);

            object chartData = !String.IsNullOrWhiteSpace(type) && type == "C"
                ? GetCustomerSitesColumnData(siteData)
                : GetCustomerSitesPieData(siteData);

            return Json(chartData, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public async Task<ActionResult> FormInfo(string customer, string site, string templateName)
        {
            var siteData = await SQLTemplateStorageManager.GetSiteFormsDataAsync(customer,site, templateName);

            return PartialView("_FormInfo", siteData);
        }

        private static object GetCustomerSitesPieData(IEnumerable<SiteChartModel> siteData)
        {
            var results = siteData.Select(m =>
                new
                {
                    Title = new List<object> { m.Title },
                    Opens = m.Opens
                }).ToList();

            results.ForEach(r =>
            {
                r.Title.Add(r.Opens);
            });

            return new
            {
                Data = results.Select(r => r.Title),
                Type = "P"
            };
        }

        private static object GetCustomerSitesColumnData(IEnumerable<SiteChartModel> siteData)
        {
            var sites = siteData.Select(c => c.Location).OrderBy(c => c).Distinct();

            var months = siteData.Select(c => c.Date).OrderBy(d => d).Distinct().ToList();

            var results = months.Select(m =>
                new
                {
                    Date = new List<object> { m },
                    Opens = (from c in sites
                             let item = siteData.FirstOrDefault(cd => cd.Location == c && cd.Date == m)
                             select item == null ? 0 : item.Opens).OfType<object>()
                }).ToList();

            results.ForEach(r =>
            {
                r.Date.AddRange(r.Opens);
            });

            var data = results.Select(r => r.Date).ToList();

            return new
            {
                Sites = sites,
                Data = data,
                Type = "C"
            };
        }
    }


    public class FormatNumberSettings
    {
        public string format { get; set; }
        public string culture { get; set; }
        public double numberToFormat { get; set; }
    }
}