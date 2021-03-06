<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:exsl="http://exslt.org/common" exclude-result-prefixes="exsl"
  	xmlns:xd="http://schemas.microsoft.com/office/infopath/2003"
    xmlns:fv="http://www.qdabra.com/FormsViewer/Xslt"
    xmlns:out="output.xsl"
>
  <xsl:output method="xml" indent="yes"/>
  <xsl:namespace-alias stylesheet-prefix="out" result-prefix="xsl" />

  <xsl:param name="ImagePrefix" select="'http://fakeUrl.com?file='" />

  <xsl:param name="CustomAttrPrefix" select="'data-fv-'" />
  <xsl:param name="ActionAttrName" select="concat($CustomAttrPrefix, 'xd-action')" />

  <xsl:template match="xsl:output">
    <out:output method="xml" omit-xml-declaration="yes">
      <xsl:apply-templates select="(@* | node())[not(name() = 'method' or name() = 'omit-xml-declaration')]" />
    </out:output>
  </xsl:template>

  <xsl:template match="node() | @*">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="@xd:*">
    <xsl:attribute name="{concat($CustomAttrPrefix, 'xd-', local-name())}">
      <xsl:value-of select="." />
    </xsl:attribute>
  </xsl:template>

  <xsl:template match="html">
    <xsl:apply-templates select="*" />
  </xsl:template>

  <xsl:template match="head |
                       @disable-output-escaping" />

  <xsl:template match="body">
    <div>
      <xsl:copy-of select="namespace::*"/>
      <xsl:attribute name="class">fvForm</xsl:attribute>
      <xsl:apply-templates />

      <xsl:call-template name="BodyExtras" />
    </div>
  </xsl:template>

  <!-- Extra HTML content that's placed at the end of the HTML body tag -->
  <xsl:template name="BodyExtras">
    <input type="hidden" value="0" id="__trigger"/>
  </xsl:template>

  <!-- Adds an id attribute combining a control id with a variable reference for a node path-->
  <xsl:template name="IdAttribute">
    <xsl:attribute name="id">
      <xsl:value-of select="concat(@xd:CtrlId, '|{$nodePath}')"/>
    </xsl:attribute>
  </xsl:template>

  <xsl:template name="ContextAttribute">
    <xsl:attribute name="{$CustomAttrPrefix}context">
      <xsl:text>{$nodePath}</xsl:text>
    </xsl:attribute>
  </xsl:template>

  <xsl:template name="NodePath">
    <xsl:param name="bindingLocation" select="@xd:binding" />

    <out:variable name="nodePath">
      <out:call-template name="buildXPath">
        <out:with-param name="node" select="{$bindingLocation}" />
      </out:call-template>
    </out:variable>
  </xsl:template>

  <xsl:template name="FvAttribute">
    <xsl:param name="binding" />
    <xsl:param name="propName" />
    <xsl:param name="attribName" />

    <xsl:attribute name="{$attribName}">
      <xsl:value-of select="concat('{xdXDocument:GetNamedNodeProperty(', 
                                   $binding, ', &quot;', $propName, '&quot;, &quot;&quot;)}')"/>
    </xsl:attribute>
  </xsl:template>

  <!-- Inserts attributes to represent the node's unique ID and data source name-->
  <xsl:template name="FvIdAttribute">
    <xsl:param name="binding" select="@xd:binding" />

    <xsl:if test="$binding">
      <xsl:call-template name="FvAttribute">
        <xsl:with-param name="binding" select="$binding" />
        <xsl:with-param name="propName" select="'fvUid'" />
        <xsl:with-param name="attribName" select="concat($CustomAttrPrefix, 'id')" />
      </xsl:call-template>
      <xsl:call-template name="FvAttribute">
        <xsl:with-param name="binding" select="$binding" />
        <xsl:with-param name="propName" select="'fvDs'" />
        <xsl:with-param name="attribName" select="concat($CustomAttrPrefix, 'ds')" />
      </xsl:call-template>
    </xsl:if>
  </xsl:template>

  <!-- Inserts the FvId Attributes, with the current context as the binding -->
  <xsl:template name="FvIdAttributeCurrentNode">
    <xsl:call-template name="FvIdAttribute">
      <xsl:with-param name="binding" select="'.'" />
    </xsl:call-template>
  </xsl:template>

  <xsl:template name="ExtraAttributes">
    <xsl:param name="binding" select="@xd:binding" />

    <!-- Not currently in use
    <xsl:call-template name="IdAttribute" />
    <xsl:call-template name="ContextAttribute" /> 
    -->
    <xsl:call-template name="FvIdAttribute">
      <xsl:with-param name="binding" select="$binding" />
    </xsl:call-template>
  </xsl:template>

  <!-- Adds FormsViewer-specific attributes -->
  <xsl:template name="FieldAttributes">
    <xsl:param name="binding" select="@xd:binding" />

    <xsl:attribute name="{$CustomAttrPrefix}editable">true</xsl:attribute>
    <xsl:call-template name="ExtraAttributes">
      <xsl:with-param name="binding" select="$binding" />
    </xsl:call-template>
  </xsl:template>

  <xsl:template name="ButtonAttributes">
    <xsl:param name="binding" select="'.'" />

    <xsl:attribute name="{$CustomAttrPrefix}clickable">true</xsl:attribute>
    <xsl:call-template name="ExtraAttributes">
      <xsl:with-param name="binding" select="$binding" />
    </xsl:call-template>
  </xsl:template>

  <!-- ========================================================================= -->
  <!-- Rule to handle text boxes -->

  <xsl:template match="*[@xd:binding and @xd:xctname = 'PlainText']">
    <xsl:variable name="isMultiline"
                  select="contains(translate(@xd:datafmt, 'AEILMNPTU', 'aeilmnptu'),
                                   'plainmultiline')" />
    <xsl:apply-templates select="(.)[$isMultiline]" mode="multiText" />
    <xsl:apply-templates select="(.)[not($isMultiline)]" mode="singleText" />
  </xsl:template>

  <xsl:template match="*" mode="singleText">
    <out:if test="1">
      <xsl:call-template name="NodePath" />
      <span class="xdTextBoxWrap">
        <input type="text" value="{{{@xd:binding}}}">
          <xsl:call-template name="FieldAttributes" />
          <xsl:apply-templates select="@*"/>
          <xsl:call-template name="TargetAttributes" />
        </input>
      </span>
    </out:if>
  </xsl:template>

  <xsl:template match="*" mode="multiText">
    <xsl:variable name="autoHeight"
                  select="not(contains(translate(@style, 'HEIGT', 'heigt'),
                                       'height:'))" />
    <textarea>
      <xsl:call-template name="FieldAttributes" />
      <xsl:apply-templates select="@*" />
      <xsl:call-template name="TargetAttributes" />
      <xsl:attribute name="data-auto-height">
        <xsl:value-of select="$autoHeight" />
      </xsl:attribute>
      <xsl:apply-templates />
    </textarea>
  </xsl:template>

  <xsl:template match="input[@type='button'] | button">
    <out:if test="1">
      <xsl:call-template name="NodePath">
        <xsl:with-param name="bindingLocation" select="'.'" />
      </xsl:call-template>
      <xsl:copy>
        <xsl:call-template name="ButtonAttributes" />
        <xsl:apply-templates select="@* | node()" />
      </xsl:copy>
    </out:if>
  </xsl:template>


  <!-- ========================================================================= -->
  <!-- Rule to handle checkboxes -->

  <xsl:template match="input[@xd:binding and @type='checkbox']">
    <out:if test="1">
      <!-- This if block just creates a new scope for the nodePath variable -->
      <xsl:call-template name="NodePath" />
      <out:choose>
        <out:when test="{@xd:binding}">
          <xsl:copy>
            <!-- TODO: Address radios and checkboxes, which respond to clicks -->
            <xsl:call-template name="FieldAttributes" />
            <xsl:attribute name="value">
              <xsl:value-of select="concat('{', @xd:binding, '}')"/>
            </xsl:attribute>
            <xsl:apply-templates select="@*|node()" />
          </xsl:copy>
        </out:when>
        <out:otherwise>
          <input type="checkbox" disabled="disabled" />
        </out:otherwise>
      </out:choose>
    </out:if>
  </xsl:template>

  <!-- ========================================================================= -->
  <!-- Rule to handle radio buttons -->

  <xsl:template match="input[@xd:binding and @type='radio']">
    <out:if test="1">
      <out:choose>
        <out:when test="{@xd:binding}">
          <!-- This if block just creates a new scope for the nodePath variable -->
          <xsl:call-template name="NodePath" />
          <xsl:copy>
            <!-- TODO: Address radios and checkboxes, which respond to clicks -->
            <xsl:call-template name="FieldAttributes" />
            <xsl:attribute name="value">
              <xsl:value-of select="@xd:onValue"/>
            </xsl:attribute>
            <xsl:apply-templates select="@*[name() != 'value' and name() != 'onclick' and name() != 'id']|node()" />
          </xsl:copy>
        </out:when>
        <out:otherwise>
          <input type="radio" disabled="disabled" />
        </out:otherwise>
      </out:choose>
    </out:if>
  </xsl:template>

  <!-- ======================================================================	-->
  <!-- Rule for a bound SELECT element										-->

  <xsl:template match="select[@xd:binding]">
    <span class="xdComboBoxWrap">
      <xsl:call-template name="NodePath" />
      <xsl:copy>
        <xsl:call-template name="FieldAttributes" />
        <xsl:apply-templates select="@*[name() != 'onclick' and name() != 'id']|node()" />
      </xsl:copy>
    </span>
  </xsl:template>

  <!-- ======================================================================	-->
  <!-- Rule for a date picker element                     -->

  <xsl:template match="*[@xd:xctname = 'DTPicker']">
    <span class="xdDTPickerWrap">
      <xsl:copy>
        <xsl:apply-templates select="@* | node()" />
      </xsl:copy>
    </span>
  </xsl:template>

  <xsl:template match="span[normalize-space(@xd:binding) and @xd:xctname='DTPicker_DTText']">
    <out:if test="1">
      <xsl:variable name="bindingLocation" select="@xd:binding" />
      <xsl:call-template name="NodePath">
        <xsl:with-param name="bindingLocation" select="$bindingLocation" />
      </xsl:call-template>
      <input type="date" data-fv-value="{{{$bindingLocation}}}">
        <xsl:call-template name="FieldAttributes">
          <xsl:with-param name="binding" select="$bindingLocation" />
        </xsl:call-template>
        <xsl:apply-templates select="@*[not(local-name() = 'type' or local-name() = 'value')]" />
        <xsl:call-template name="TargetAttributes" />
        <out:attribute name="value">
          <xsl:call-template name="SkipAttributes" />
        </out:attribute>
      </input>
    </out:if>
  </xsl:template>

  <xsl:template name="SkipAttributes">
    <xsl:apply-templates select="node()[not(self::xsl:attribute)]" mode="skipAttributes" />
  </xsl:template>

  <xsl:template match="node() | @*" mode="skipAttributes">
    <xsl:copy>
      <xsl:apply-templates select="@*" />
      <xsl:call-template name="SkipAttributes" />
    </xsl:copy>
  </xsl:template>

  <!-- Copies XSL pieces that add attributes to the destination document -->
  <xsl:template name="TargetAttributes">
    <xsl:apply-templates select="node()[ancestor::xsl:attribute or descendant-or-self::xsl:attribute]"
                         mode="targetAttributes"/>
  </xsl:template>

  <xsl:template match="@* | node()" mode="targetAttributes">
    <xsl:copy>
      <xsl:apply-templates select="@*" />
      <xsl:call-template name="TargetAttributes" />
    </xsl:copy>
  </xsl:template>

  <!-- Omit the datepicker button (for now?) -->
  <xsl:template match="*[@xd:xctname = 'DTPicker_DTButton']" />

  <!-- ======================================================================	-->
  <!-- Rule for an inline image										-->
  <xsl:template match="xsl:if[contains(@test, 'function-available') and 
                              contains(@test, 'getImageUrl')][img/@xd:xctname = 'InlineImage']">
    <!-- Get rid of the the <xsl:if> tags and just use the image inside -->
    <xsl:apply-templates select="node()" />
  </xsl:template>

  <xsl:variable name="AltImage"
      select="concat('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAoHBwkHBgoJCAkLCwoMDxkQDw4ODx4WFxIZJCAmJSMgIyIoLTkwKCo2KyIjMkQyNjs9QEBAJj',
                     'BGS0U+Sjk/QD3/2wBDAQsLCw8NDx0QEB09KSMpPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT3/',
                     'wAARCAAQABEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBR',
                     'IhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4',
                     'eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHw',
                     'EAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMz',
                     'UvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoq',
                     'OkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD063h06PTLR7mK1Blj',
                     'QAyKuXYgevU1zgEbyMJ7KPiAtJ5loiqknHCHaMjr69BzVafXtJg0aGM3kM1w8CpKJZA20bRlMZwB2IxzjnJri9R11baV20+6CPt+Vgd3mH',
                     'H3ZM5JXgYP3hyAQDiuj2MuZTu9CFUSi42Wphfa5f8Anq//AH0aKzvN96K9PlOK5//Z')" />

  <xsl:template match="img[@xd:xctname = 'InlineImage']">
    <out:if test="1">
      <xsl:call-template name="NodePath" />

      <out:choose>
        <!-- Show the placeholder when the field's value is blank -->
        <out:when test="{@xd:binding} = ''">
          <div class="fv-image-placeholder">
            <xsl:apply-templates select="@xd:*" />
            <xsl:call-template name="ButtonAttributes">
              <xsl:with-param name="binding" select="@xd:binding" />
            </xsl:call-template>
            <xsl:attribute name="{$ActionAttrName}">image</xsl:attribute>
            <xsl:if test="@xd:disableEditing = 'yes'">
              <xsl:attribute name="disabled">true</xsl:attribute>
            </xsl:if>
            <xsl:apply-templates select="node()" />
            <xsl:choose>
              <xsl:when test="@alt != ''">
                <xsl:value-of select="@alt"/>
              </xsl:when>
              <xsl:otherwise>
                <img alt="{@alt}" style="margin: 5px;">
                  <out:call-template name="ImageSource">
                    <out:with-param name="imageValue" select="'{$AltImage}'" />
                  </out:call-template>
                </img>
              </xsl:otherwise>
            </xsl:choose>
          </div>
        </out:when>
        <out:otherwise>
          <xsl:copy>
            <xsl:apply-templates select="@*[name() != 'src']" />
            <xsl:call-template name="ButtonAttributes">
              <xsl:with-param name="binding" select="@xd:binding" />
            </xsl:call-template>
            <xsl:if test="@xd:disableEditing = 'yes'">
              <xsl:attribute name="disabled">true</xsl:attribute>
            </xsl:if>
            <xsl:attribute name="{$ActionAttrName}">image</xsl:attribute>
            <out:call-template name="ImageSource">
              <out:with-param name="imageValue" select="{@xd:binding}" />
            </out:call-template>
            <xsl:apply-templates select="node()" />
          </xsl:copy>
        </out:otherwise>
      </out:choose>
    </out:if>
  </xsl:template>

  <!-- Currently not supporting linked images -->
  <xsl:template match="img[@xd:xctname = 'LinkedImage']" />

  <xsl:template match="img[not(@xd:xctname)]">
    <xsl:copy>
      <xsl:attribute name="class">
        <xsl:value-of select="concat('fvStaticImage ', @class)" />
      </xsl:attribute>
      <xsl:apply-templates select="@*[not(name() = 'class')] | node()" />
    </xsl:copy>
  </xsl:template>

  <xsl:template match="img/@src">
    <xsl:attribute name="src">
      <xsl:value-of select="concat($ImagePrefix, .)" />
    </xsl:attribute>
  </xsl:template>

  <xsl:template match="*[@xd:action = 'xCollection::insert']">
    <xsl:copy>
      <xsl:call-template name="FvIdAttributeCurrentNode" />
      <xsl:apply-templates select ="@* | node()" />
    </xsl:copy>
  </xsl:template>

  <xsl:template name="RepeaterAttribute">
    <xsl:attribute name ="{concat($CustomAttrPrefix, 'repeater')}">true</xsl:attribute>
  </xsl:template>

  <!-- Repeating tables -->
  <xsl:template match="tbody[@xd:xctname = 'RepeatingTable']/xsl:for-each/tr">
    <xsl:copy>
      <xsl:apply-templates select="@*" />
      <xsl:call-template name="RepeaterAttribute" />
      <xsl:call-template name="FvIdAttributeCurrentNode" />
      <xsl:apply-templates select="node()" />
    </xsl:copy>
  </xsl:template>

  <xsl:template match="tbody[@xd:xctname = 'RepeatingTable']/xsl:for-each/tr/td[1]">
    <xsl:copy>
      <xsl:apply-templates select="@*" />
      <xsl:call-template name="MenuWidget" />
      <xsl:apply-templates />
    </xsl:copy>
  </xsl:template>

  <xsl:template match="tbody[@xd:xctname = 'RepeatingTable']/xsl:for-each/tr[not(td)]">
    <xsl:copy>
      <xsl:apply-templates select="@*" />
      <xsl:call-template name="RepeaterAttribute" />
      <xsl:call-template name="FvIdAttributeCurrentNode" />
      <td>
        <xsl:call-template name="MenuWidget" />
      </td>
      <xsl:apply-templates />
    </xsl:copy>
  </xsl:template>

  <!-- Repeating sections -->
  <xsl:template match="*[@xd:xctname = 'RepeatingSection']">
    <xsl:copy>
      <xsl:apply-templates select="@*" />
      <xsl:call-template name="RepeaterAttribute" />
      <xsl:call-template name="FvIdAttributeCurrentNode" />
      <xsl:call-template name="MenuWidget" />
      <xsl:apply-templates />
    </xsl:copy>
  </xsl:template>

  <xsl:template name="MenuWidget">
    <div class="fv-menu-widget-holder">
      <div class="fv-menu-widget" />
    </div>
  </xsl:template>

  <xsl:template match="*[@xd:xctname = 'FileAttachment']">
    <xsl:copy>
      <xsl:variable name="binding" select="@xd:binding" />
      <xsl:apply-templates select="@*" />
      <xsl:call-template name="ButtonAttributes">
        <xsl:with-param name="binding" select="$binding" />
      </xsl:call-template>
      <xsl:attribute name="{$ActionAttrName}">file</xsl:attribute>
      <out:choose>
        <out:when test="{$binding} = ''">
          <xsl:text>Click here to attach a file.</xsl:text>
        </out:when>
        <out:otherwise>
          <out:value-of select="fv:file-name({$binding})"/>
        </out:otherwise>
      </out:choose>
    </xsl:copy>
  </xsl:template>

  <!-- This matches the actual stylesheet that's being processed.  It runs templates on everything in the stylesheet
       and then inserts the contents of StylesheetExtras to add a few more templates. -->
  <xsl:template match="xsl:stylesheet">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>

      <xsl:call-template name="StylesheetExtras" />
    </xsl:copy>
  </xsl:template>

  <xsl:template match="@style">
    <xsl:attribute name="style">
      <xsl:call-template name="Replace">
        <xsl:with-param name="replacements">
          <!-- Font size names are browser-dependent and do not match InfoPath's definition of them -->
          <item from="FONT-SIZE: xx-small" to="FONT-SIZE: 8pt" />
          <item from="FONT-SIZE: x-small"  to="FONT-SIZE: 10pt" />
          <item from="FONT-SIZE: small"    to="FONT-SIZE: 12pt" />
          <item from="FONT-SIZE: medium"   to="FONT-SIZE: 14pt" />
          <item from="FONT-SIZE: large"    to="FONT-SIZE: 18pt" />
          <item from="FONT-SIZE: x-large"  to="FONT-SIZE: 24pt" />
          <item from="FONT-SIZE: xx-large" to="FONT-SIZE: 36pt" />
        </xsl:with-param>
      </xsl:call-template>
    </xsl:attribute>
  </xsl:template>

  <xsl:template name="Replace">
    <xsl:param name="value" select="." />
    <xsl:param name="replacements" select ="/.." />

    <xsl:variable name="foundMatch" select="exsl:node-set($replacements)/*[contains($value, @from)][1]" />

    <xsl:choose>
      <xsl:when test="$foundMatch">
        <xsl:call-template name="Replace">
          <xsl:with-param name="value" select="concat(substring-before($value, $foundMatch/@from),
                                                      $foundMatch/@to,
                                                      substring-after($value, $foundMatch/@from))" />
          <xsl:with-param name="replacements" select="$replacements" />
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$value" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="StylesheetExtras">
    <!-- ======================================================================	-->
    <!-- XSL equivalent for qdImage:buildXPath  -->

    <out:template name="buildXPath">
      <out:param name="node" select="." />
      <out:if test="$node and $node/..">
        <out:call-template name="buildXPath">
          <out:with-param select="$node/.." name="node" />
        </out:call-template>
        <out:choose>
          <out:when test="count($node | $node/../@*) = count($node/../@*)">
            <out:value-of select="concat('/@*[local-name()=&quot;',
                                         local-name($node),
                                         '&quot; and namespace-uri()=&quot;', 
                                         namespace-uri($node),'&quot;]')"/>
          </out:when>
          <out:otherwise>
            <out:value-of select="concat('/*[',count($node/preceding-sibling::*)+1,']')"/>
          </out:otherwise>
        </out:choose>
      </out:if>
    </out:template>

    <out:template name="ImageSource">
      <out:param name="imageValue" />
      <out:attribute name="src">
        <out:variable name="fileType">
          <out:choose>
            <out:when test="starts-with($imageValue, '/9j/')">
              <out:value-of select="'jpg'"/>
            </out:when>
            <out:when test="starts-with($imageValue, 'R0lG')">
              <out:value-of select="'gif'" />
            </out:when>
            <out:otherwise>
              <out:value-of select="'bmp'" />
            </out:otherwise>
          </out:choose>
        </out:variable>

        <out:value-of select="concat('data:image/', $fileType, ';base64,', $imageValue)" />
      </out:attribute>
    </out:template>

  </xsl:template>

</xsl:stylesheet>
