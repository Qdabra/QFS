using StructureMap;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace QFSWeb.App_Start
{ 
    /// <summary>
    /// Structure map controller factory for maping instance
    /// </summary>
    public class StructureMapControllerFactory : DefaultControllerFactory
    {
        /// <summary>
        /// 
        /// </summary>
        /// <param name="requestContext"></param>
        /// <param name="controllerType"></param>
        /// <returns></returns>
        protected override IController GetControllerInstance(System.Web.Routing.RequestContext requestContext, Type controllerType)
        {
            return controllerType != null ? (IController)ObjectFactory.GetInstance(controllerType) : null;
        }
    }
}