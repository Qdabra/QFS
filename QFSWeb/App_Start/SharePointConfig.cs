using QFSWeb.Utilities;

namespace QFSWeb.App_Start
{
    public class SharePointConfig
    {
        public static void RegisterProvider()
        {
            //Register the serializable context provider as the current
            SharePointContextProvider.Register(new SharePointAcsSerializableContextProvider());
        }
    }
}