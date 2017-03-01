<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xsf="http://schemas.microsoft.com/office/infopath/2003/solutionDefinition"
                xmlns:udc="http://schemas.microsoft.com/office/infopath/2006/udc" xmlns:msxsl="urn:schemas-microsoft-com:xslt" exclude-result-prefixes="msxsl udc xsf"
 >
  <xsl:output method="xml" indent="yes" omit-xml-declaration="yes"/>
  <xsl:template match="xsf:webServiceAdapter">
    <Properties>
      <xsl:apply-templates select="xsf:operation"/>
    </Properties>
  </xsl:template>

  <xsl:template match="xsf:davAdapter">
    <Properties>
      <xsl:apply-templates select="node()"/>
    </Properties>
  </xsl:template>

  <xsl:template match="xsf:emailAdapter">
    <Properties>
      <xsl:apply-templates select="node()"/>
    </Properties>
  </xsl:template>

  <xsl:template match="udc:ConnectionInfo">
    <Properties>
      <xsl:apply-templates select="udc:WsdlUrl[. != '']|udc:SelectCommand/*[. != '']|udc:UpdateCommand/*[. != '' and not(self::udc:FileName)]"/>
    </Properties>
  </xsl:template>

  <xsl:template match="udc:WsdlUrl|udc:SelectCommand/*|udc:UpdateCommand/*">
    <xsl:call-template name="Property">
      <xsl:with-param name="Name">
        <xsl:value-of select="local-name()"/>
      </xsl:with-param>
      <xsl:with-param name="Value">
        <xsl:value-of select="."/>
      </xsl:with-param>
    </xsl:call-template>
  </xsl:template>

  <xsl:template match="xsf:fileName|xsf:folderURL|xsf:to|xsf:cc|xsf:bcc|xsf:subject|xsf:intro|xsf:attachmentFileName">
    <xsl:call-template name="Property">
      <xsl:with-param name="Name">
        <xsl:value-of select="local-name()"/>
      </xsl:with-param>
      <xsl:with-param name="Value">
        <xsl:value-of select="@value"/>
      </xsl:with-param>
    </xsl:call-template>
    <xsl:apply-templates select="@valueType"/>
  </xsl:template>

  <xsl:template match="@valueType">
    <xsl:call-template name="Property">
      <xsl:with-param name="Name">
        <xsl:value-of select="concat(local-name(..), ' value type')"/>
      </xsl:with-param>
      <xsl:with-param name="Value">
        <xsl:value-of select="."/>
      </xsl:with-param>
    </xsl:call-template>
  </xsl:template>

  <xsl:template match="xsf:operation">
    <xsl:apply-templates select="@*"/>
  </xsl:template>

  <xsl:template match="@name|@soapAction|@serviceUrl">
    <xsl:call-template name="Property">
      <xsl:with-param name="Name">
        <xsl:value-of select="local-name()"/>
      </xsl:with-param>
      <xsl:with-param name="Value">
        <xsl:value-of select="."/>
      </xsl:with-param>
    </xsl:call-template>
  </xsl:template>

  <xsl:template name="Property">
    <xsl:param name="Name"/>
    <xsl:param name ="Value"/>
    <Property>
      <Name>
        <xsl:value-of select="$Name"/>
      </Name>
      <Value>
        <xsl:value-of select="$Value"/>
      </Value>
    </Property>
  </xsl:template>

</xsl:stylesheet>
