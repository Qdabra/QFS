<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="no"/>
  <xsl:template match="/FormInformation">
    <div>
      <div>
        <h2>Form Properties</h2>
        <table border="1">
          <tr bgcolor="Gainsboro">
            <th style="text-align:left">Name</th>
            <th style="text-align:left">Value</th>
          </tr>
          <xsl:for-each select="FormProperties/Property">
            <tr>
              <td>
                <xsl:value-of select="Name" />
              </td>
              <td>
                <xsl:value-of select="Value" />
              </td>
            </tr>
          </xsl:for-each>
        </table>
      </div>
      <div>
        <h2>Data Connections</h2>
        <table border="1">
          <tr bgcolor="Gainsboro">
            <th style="text-align:left">Name</th>
            <th style="text-align:left">Connection Type</th>
            <th style="text-align:left">QueryOnLoad</th>
            <th style="text-align:left">Udcx</th>
            <th style="text-align:left">Default Submit</th>
          </tr>
          <xsl:for-each select="DataConnections/DataConnection">
            <tr>
              <td>
                <xsl:value-of select="Name" />
              </td>
              <td>
                <xsl:value-of select="ConnectionType" />
              </td>
              <td>
                <xsl:value-of select="QueryOnLoad" />
              </td>
              <td>
                <xsl:value-of select="Udcx" />
              </td>
              <td>
                <xsl:value-of select="DefaultSubmit" />
              </td>
            </tr>
          </xsl:for-each>
        </table>
      </div>
      <div>
        <h2>Views</h2>
        <table border="1">
          <tr bgcolor="Gainsboro">
            <th style="text-align:left">Name</th>
            <th style="text-align:left">FileName</th>
            <th style="text-align:right">Length</th>
            <th style="text-align:right">Size</th>
          </tr>
          <xsl:for-each select="ViewInfos/ViewInfo">
            <tr>
              <td>
                <xsl:value-of select="Name" />
              </td>
              <td>
                <xsl:value-of select="FileName" />
              </td>
              <td>
                <xsl:value-of select="Length" />
              </td>
              <td>
                <xsl:value-of select="Size" />
              </td>
            </tr>
          </xsl:for-each>
        </table>
      </div>
      <div>
        <h2>Promoted Properties</h2>
        <table border="1">
          <tr bgcolor="Gainsboro">
            <th style="text-align:left">Name</th>
            <th style="text-align:left">Node Path</th>
            <th style="text-align:left">Data Type</th>
            <th style="text-align:left">Aggregation</th>
          </tr>
          <xsl:for-each select="PromotedProperties/PromotedProperty">
            <tr>
              <td>
                <xsl:value-of select="Name" />
              </td>
              <td>
                <xsl:value-of select="NodePath" />
              </td>
              <td>
                <xsl:value-of select="DataType" />
              </td>
              <td>
                <xsl:value-of select="Aggregation" />
              </td>
            </tr>
          </xsl:for-each>
        </table>
      </div>
      <div>
        <h2>DLL Infos</h2>
        <table border="1">
          <tr bgcolor="Gainsboro">
            <th style="text-align:left">Name</th>
            <th style="text-align:right">Size</th>
            <th style="text-align:right">Version</th>
          </tr>
          <xsl:for-each select="DLLInfos/DLLInfo">
            <tr>
              <td>
                <xsl:value-of select="Name" />
              </td>
              <td>
                <xsl:value-of select="Size" />
              </td>
              <td>
                <xsl:value-of select="Version" />
              </td>
            </tr>
          </xsl:for-each>
        </table>
      </div>
      <div>
        <h2>Detailing Results</h2>
        <table border="1">
          <tr bgcolor="Gainsboro">
            <th style="text-align:left">Item</th>
            <th style="text-align:left">Status</th>
            <th style="text-align:left">Analysis</th>
          </tr>
          <xsl:for-each select="DetailingResults/DetailingResult">
            <tr>
              <td>
                <xsl:value-of select="Item" />
              </td>
              <td>
                <xsl:value-of select="Status" />
              </td>
              <td>
                <xsl:value-of select="Analysis" />
              </td>
            </tr>
          </xsl:for-each>
        </table>
      </div>
    </div>
  </xsl:template>
</xsl:stylesheet>

