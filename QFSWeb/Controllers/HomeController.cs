using Microsoft.SharePoint.Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using QFSWeb.MvcUtils;

namespace QFSWeb.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult About()
        {
            ViewBag.Message = "FormsQuo eForm Services makes your job easier with eForm Innovations that help you assess, maintain, extend and migrate your existing eForm investment.";

            return View();
        }

        public ActionResult Contact()
        {
            ViewBag.Message = "Need eForms help? You've come to the right place: contact us for a FREE consultation, and we’ll put you on a path to success.";

            return View();
        }

        public ActionResult ReleaseNotes()
        {
            return View();
        }
    }
}
