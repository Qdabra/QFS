<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="yes" omit-xml-declaration="yes"/>

  <xsl:param name="ImagePrefix" select="'http://fakeUrl.com?file='" />

  <xsl:template match="@* | node()" priority="-1">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="*">
    <xsl:element name="{name()}" namespace="{namespace-uri()}">
      <xsl:apply-templates select="@* | node()" />
    </xsl:element>
  </xsl:template>

  <xsl:template match ="body/@style">
    <style>
      <xsl:value-of select="concat('.fvForm {', ., '}')"/>
    </style>
  </xsl:template>

  <xsl:template match="body/@background">
    <style>
      <xsl:value-of select="concat(&quot;.fvForm { background-image: url('&quot;, $ImagePrefix, ., &quot;'); }&quot;)"/>
    </style>
  </xsl:template>

  <xsl:template match="/*">
    <head>
      <xsl:apply-templates select="//head/*" />
      <xsl:apply-templates select="//body/@style" />
      <xsl:apply-templates select="//body/@background" />
      <style>
        <!-- Temporary layout fix - textboxes need to be wrapped with a span that provides their margin -->
        .xdTextBox { margin: 0; font-family: inherit; font-size: inherit; }
        .xdTextBoxWrap { margin: 1px; }

        .xdListBox,.xdComboBox{margin:0;}
        .xdListBoxWrap, .xdComboBoxWrap { }

        .xdDTPicker { margin: 0; display: inline-block; position: relative; border: 0; overflow: visible; }
        .xdDTPickerWrap { }
        
        .xdExpressionBox { display: inline-block; overflow: visible; }

        <!-- This border color may not match all themes -->
        .xdDTText { margin: 0; border: 1pt solid #dcdcdc; background-color: transparent; padding: 1px; font-family: inherit; font-size: inherit; }

        .xdRepeating { position: relative; }

        .fvForm div, .fvForm table { text-align: left; }
        .fvForm [align = 'center'] { text-align: center; }
        .fvForm [align = 'right'] { text-align: right; }
        .fvForm [align = 'left']   > * { margin-right: auto !important; }
        .fvForm [align = 'center'] > * { margin-left: auto !important; margin-right: auto !important; }
        .fvForm [align = 'right']  > * { margin-left: auto !important; }

        .fvForm input[type = button] { padding: 3px 0 4px; min-width: 0; margin: 0; }

        .fvForm textarea { font-family: inherit; }

        .optionalPlaceholder { font-family: Tahoma; font-size: 9pt; }
        .optionalPlaceholder:hover, .optionalPlaceholder:hover > * { text-decoration: underline; }

        .fvStaticImage { vertical-align: text-bottom; }

        .fvForm .fv-menu-holder { z-index: 10; }

        <!-- Prevent clear button on disabled controls -->
        [contenteditable=false]::-ms-clear,
        [disabled=disabled]::-ms-clear { display: none; }
      </style>
    </head>
  </xsl:template>

</xsl:stylesheet>
