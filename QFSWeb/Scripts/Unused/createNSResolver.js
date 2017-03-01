function createNSR()
{
    var nsr = new XmlNamespaceResolver;

    nsr.addNamespace("xsf", "http://schemas.microsoft.com/office/infopath/2003/solutionDefinition");
    nsr.addNamespace("xsf2", "http://schemas.microsoft.com/office/infopath/2006/solutionDefinition/extensions");
    nsr.addNamespace("xsf3", "http://schemas.microsoft.com/office/infopath/2009/solutionDefinition/extensions");
    nsr.addNamespace("msxsl", "urn:schemas-microsoft-com:xslt");
    nsr.addNamespace("xd", "http://schemas.microsoft.com/office/infopath/2003");
    nsr.addNamespace("xsi", "http://www.w3.org/2001/XMLSchema-instance");
    nsr.addNamespace("xdUtil", "http://schemas.microsoft.com/office/infopath/2003/xslt/Util");
    nsr.addNamespace("xdXDocument", "http://schemas.microsoft.com/office/infopath/2003/xslt/xDocument");
    nsr.addNamespace("xdMath", "http://schemas.microsoft.com/office/infopath/2003/xslt/Math");
    nsr.addNamespace("xdDate", "http://schemas.microsoft.com/office/infopath/2003/xslt/Date");
    nsr.addNamespace("xdExtension", "http://schemas.microsoft.com/office/infopath/2003/xslt/extension");
    nsr.addNamespace("xdEnvironment", "http://schemas.microsoft.com/office/infopath/2006/xslt/environment");
    nsr.addNamespace("xdUser", "http://schemas.microsoft.com/office/infopath/2006/xslt/User");
    nsr.addNamespace("xdServerInfo", "http://schemas.microsoft.com/office/infopath/2009/xslt/ServerInfo");
    nsr.addNamespace("my", "http://schemas.microsoft.com/office/infopath/2003/myXSD/2013-10-03T15:29:50");

    return nsr;
}