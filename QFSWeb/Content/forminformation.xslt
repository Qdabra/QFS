<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ns1="http://schemas.datacontract.org/2004/07/InfoPathServices" xmlns:my="http://schemas.microsoft.com/office/infopath/2003/myXSD/2013-10-31T15:44:18" xmlns:xd="http://schemas.microsoft.com/office/infopath/2003" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:msxsl="urn:schemas-microsoft-com:xslt" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:xdExtension="http://schemas.microsoft.com/office/infopath/2003/xslt/extension" xmlns:xdXDocument="http://schemas.microsoft.com/office/infopath/2003/xslt/xDocument" xmlns:xdSolution="http://schemas.microsoft.com/office/infopath/2003/xslt/solution" xmlns:xdFormatting="http://schemas.microsoft.com/office/infopath/2003/xslt/formatting" xmlns:xdImage="http://schemas.microsoft.com/office/infopath/2003/xslt/xImage" xmlns:xdUtil="http://schemas.microsoft.com/office/infopath/2003/xslt/Util" xmlns:xdMath="http://schemas.microsoft.com/office/infopath/2003/xslt/Math" xmlns:xdDate="http://schemas.microsoft.com/office/infopath/2003/xslt/Date" xmlns:sig="http://www.w3.org/2000/09/xmldsig#" xmlns:xdSignatureProperties="http://schemas.microsoft.com/office/infopath/2003/SignatureProperties" xmlns:ipApp="http://schemas.microsoft.com/office/infopath/2006/XPathExtension/ipApp" xmlns:xdEnvironment="http://schemas.microsoft.com/office/infopath/2006/xslt/environment" xmlns:xdUser="http://schemas.microsoft.com/office/infopath/2006/xslt/User" xmlns:xdServerInfo="http://schemas.microsoft.com/office/infopath/2009/xslt/ServerInfo">
  <xsl:output method="html" indent="no"/>
  <xsl:template match="ns1:FormInformation">
    <html>
      <head>
        <meta content="text/html" http-equiv="Content-Type"></meta>
        <style controlStyle="controlStyle">@media screen 			{ 			BODY{margin-left:21px;background-position:21px 0px;} 			} 		BODY{color:windowtext;background-color:window;layout-grid:none;} 		.xdListItem {display:inline-block;width:100%;vertical-align:text-top;} 		.xdListBox,.xdComboBox{margin:1px;} 		.xdInlinePicture{margin:1px; BEHAVIOR: url(#default#urn::xdPicture) } 		.xdLinkedPicture{margin:1px; BEHAVIOR: url(#default#urn::xdPicture) url(#default#urn::controls/Binder) } 		.xdHyperlinkBox{word-wrap:break-word; text-overflow:ellipsis;overflow-x:hidden; OVERFLOW-Y: hidden; WHITE-SPACE:nowrap; display:inline-block;margin:1px;padding:5px;border: 1pt solid #dcdcdc;color:windowtext;BEHAVIOR: url(#default#urn::controls/Binder) url(#default#DataBindingUI)} 		.xdSection{border:1pt solid transparent ;margin:0px 0px 0px 0px;padding:0px 0px 0px 0px;} 		.xdRepeatingSection{border:1pt solid transparent;margin:0px 0px 0px 0px;padding:0px 0px 0px 0px;} 		.xdMultiSelectList{margin:1px;display:inline-block; border:1pt solid #dcdcdc; padding:1px 1px 1px 5px; text-indent:0; color:windowtext; background-color:window; overflow:auto; behavior: url(#default#DataBindingUI) url(#default#urn::controls/Binder) url(#default#MultiSelectHelper) url(#default#ScrollableRegion);} 		.xdMultiSelectListItem{display:block;white-space:nowrap}		.xdMultiSelectFillIn{display:inline-block;white-space:nowrap;text-overflow:ellipsis;;padding:1px;margin:1px;border: 1pt solid #dcdcdc;overflow:hidden;text-align:left;}		.xdBehavior_Formatting {BEHAVIOR: url(#default#urn::controls/Binder) url(#default#Formatting);} 	 .xdBehavior_FormattingNoBUI{BEHAVIOR: url(#default#CalPopup) url(#default#urn::controls/Binder) url(#default#Formatting);} 	.xdExpressionBox{margin: 1px;padding:1px;word-wrap: break-word;text-overflow: ellipsis;overflow-x:hidden;}.xdBehavior_GhostedText,.xdBehavior_GhostedTextNoBUI{BEHAVIOR: url(#default#urn::controls/Binder) url(#default#TextField) url(#default#GhostedText);}	.xdBehavior_GTFormatting{BEHAVIOR: url(#default#urn::controls/Binder) url(#default#Formatting) url(#default#GhostedText);}	.xdBehavior_GTFormattingNoBUI{BEHAVIOR: url(#default#CalPopup) url(#default#urn::controls/Binder) url(#default#Formatting) url(#default#GhostedText);}	.xdBehavior_Boolean{BEHAVIOR: url(#default#urn::controls/Binder) url(#default#BooleanHelper);}	.xdBehavior_Select{BEHAVIOR: url(#default#urn::controls/Binder) url(#default#SelectHelper);}	.xdBehavior_ComboBox{BEHAVIOR: url(#default#ComboBox)} 	.xdBehavior_ComboBoxTextField{BEHAVIOR: url(#default#ComboBoxTextField);} 	.xdRepeatingTable{BORDER-TOP-STYLE: none; BORDER-RIGHT-STYLE: none; BORDER-LEFT-STYLE: none; BORDER-BOTTOM-STYLE: none; BORDER-COLLAPSE: collapse; WORD-WRAP: break-word;}.xdScrollableRegion{BEHAVIOR: url(#default#ScrollableRegion);} 		.xdLayoutRegion{display:inline-block;} 		.xdMaster{BEHAVIOR: url(#default#MasterHelper);} 		.xdActiveX{margin:1px; BEHAVIOR: url(#default#ActiveX);} 		.xdFileAttachment{display:inline-block;margin:1px;BEHAVIOR:url(#default#urn::xdFileAttachment);} 		.xdSharePointFileAttachment{display:inline-block;margin:2px;BEHAVIOR:url(#default#xdSharePointFileAttachment);} 		.xdAttachItem{display:inline-block;width:100%%;height:25px;margin:1px;BEHAVIOR:url(#default#xdSharePointFileAttachItem);} 		.xdSignatureLine{display:inline-block;margin:1px;background-color:transparent;border:1pt solid transparent;BEHAVIOR:url(#default#SignatureLine);} 		.xdHyperlinkBoxClickable{behavior: url(#default#HyperlinkBox)} 		.xdHyperlinkBoxButtonClickable{border-width:1px;border-style:outset;behavior: url(#default#HyperlinkBoxButton)} 		.xdPictureButton{background-color: transparent; padding: 0px; behavior: url(#default#PictureButton);} 		.xdPageBreak{display: none;}BODY{margin-right:21px;} 		.xdTextBoxRTL{display:inline-block;white-space:nowrap;text-overflow:ellipsis;;padding:1px;margin:1px;border: 1pt solid #dcdcdc;color:windowtext;background-color:window;overflow:hidden;text-align:right;word-wrap:normal;} 		.xdRichTextBoxRTL{display:inline-block;;padding:1px;margin:1px;border: 1pt solid #dcdcdc;color:windowtext;background-color:window;overflow-x:hidden;word-wrap:break-word;text-overflow:ellipsis;text-align:right;font-weight:normal;font-style:normal;text-decoration:none;vertical-align:baseline;} 		.xdDTTextRTL{height:100%;width:100%;margin-left:22px;overflow:hidden;padding:0px;white-space:nowrap;} 		.xdDTButtonRTL{margin-right:-21px;height:17px;width:20px;behavior: url(#default#DTPicker);} 		.xdMultiSelectFillinRTL{display:inline-block;white-space:nowrap;text-overflow:ellipsis;;padding:1px;margin:1px;border: 1pt solid #dcdcdc;overflow:hidden;text-align:right;}.xdTextBox{display:inline-block;white-space:nowrap;text-overflow:ellipsis;;padding:1px;margin:1px;border: 1pt solid #dcdcdc;color:windowtext;background-color:window;overflow:hidden;text-align:left;word-wrap:normal;} 		.xdRichTextBox{display:inline-block;;padding:1px;margin:1px;border: 1pt solid #dcdcdc;color:windowtext;background-color:window;overflow-x:hidden;word-wrap:break-word;text-overflow:ellipsis;text-align:left;font-weight:normal;font-style:normal;text-decoration:none;vertical-align:baseline;} 		.xdDTPicker{;display:inline;margin:1px;margin-bottom: 2px;border: 1pt solid #dcdcdc;color:windowtext;background-color:window;overflow:hidden;text-indent:0; layout-grid: none} 		.xdDTText{height:100%;width:100%;margin-right:22px;overflow:hidden;padding:0px;white-space:nowrap;} 		.xdDTButton{margin-left:-21px;height:17px;width:20px;behavior: url(#default#DTPicker);} 		.xdRepeatingTable TD {VERTICAL-ALIGN: top;}</style>
        <style tableEditor="TableStyleRulesID">
          TABLE.xdLayout TD {
          BORDER-TOP: medium none; BORDER-RIGHT: medium none; BORDER-BOTTOM: medium none; BORDER-LEFT: medium none
          }
          TABLE.msoUcTable TD {
          BORDER-TOP: 1pt solid; BORDER-RIGHT: 1pt solid; BORDER-BOTTOM: 1pt solid; BORDER-LEFT: 1pt solid
          }
          TABLE {
          BEHAVIOR: url (#default#urn::tables/NDTable)
          }
        </style>
        <style languageStyle="languageStyle">
          BODY {
          FONT-SIZE: 10pt; FONT-FAMILY: Calibri
          }
          SELECT {
          FONT-SIZE: 10pt; FONT-FAMILY: Calibri
          }
          TABLE {
          FONT-SIZE: 10pt; FONT-FAMILY: Calibri; TEXT-TRANSFORM: none; FONT-WEIGHT: normal; COLOR: black; FONT-STYLE: normal
          }
          .optionalPlaceholder {
          FONT-SIZE: 9pt; FONT-FAMILY: Calibri; FONT-WEIGHT: normal; COLOR: #333333; FONT-STYLE: normal; PADDING-LEFT: 20px; TEXT-DECORATION: none; BEHAVIOR: url(#default#xOptional)
          }
          .langFont {
          FONT-SIZE: 10pt; FONT-FAMILY: Calibri; WIDTH: 150px
          }
          .defaultInDocUI {
          FONT-SIZE: 9pt; FONT-FAMILY: Calibri
          }
          .optionalPlaceholder {
          PADDING-RIGHT: 20px
          }
        </style>
        <style themeStyle="urn:office.microsoft.com:themeRicasso">
          TABLE {
          BORDER-TOP: medium none; BORDER-RIGHT: medium none; BORDER-COLLAPSE: collapse; BORDER-BOTTOM: medium none; BORDER-LEFT: medium none
          }
          TD {
          BORDER-TOP-COLOR: #d8d8d8; BORDER-BOTTOM-COLOR: #d8d8d8; BORDER-RIGHT-COLOR: #d8d8d8; BORDER-LEFT-COLOR: #d8d8d8
          }
          TH {
          BORDER-TOP-COLOR: #000000; COLOR: black; BORDER-BOTTOM-COLOR: #000000; BORDER-RIGHT-COLOR: #000000; BACKGROUND-COLOR: #f2f2f2; BORDER-LEFT-COLOR: #000000
          }
          .xdTableHeader {
          COLOR: black; BACKGROUND-COLOR: #f2f2f2
          }
          .light1 {
          BACKGROUND-COLOR: #ffffff
          }
          .dark1 {
          BACKGROUND-COLOR: #000000
          }
          .light2 {
          BACKGROUND-COLOR: #fbfbfb
          }
          .dark2 {
          BACKGROUND-COLOR: #525252
          }
          .accent1 {
          BACKGROUND-COLOR: #000000
          }
          .accent2 {
          BACKGROUND-COLOR: #b2b2b2
          }
          .accent3 {
          BACKGROUND-COLOR: #969696
          }
          .accent4 {
          BACKGROUND-COLOR: #c00000
          }
          .accent5 {
          BACKGROUND-COLOR: #6d6d6d
          }
          .accent6 {
          BACKGROUND-COLOR: #5a5a5a
          }
        </style>
        <style tableStyle="Professional">
          TR.xdTitleRow {
          MIN-HEIGHT: 83px
          }
          TD.xdTitleCell {
          BORDER-TOP: #bfbfbf 1pt solid; BORDER-RIGHT: #bfbfbf 1pt solid; PADDING-BOTTOM: 14px; TEXT-ALIGN: center; PADDING-TOP: 32px; PADDING-LEFT: 22px; BORDER-LEFT: #bfbfbf 1pt solid; PADDING-RIGHT: 22px; BACKGROUND-COLOR: #ffffff; valign: bottom
          }
          TR.xdTitleRowWithHeading {
          MIN-HEIGHT: 69px
          }
          TD.xdTitleCellWithHeading {
          BORDER-TOP: #bfbfbf 1pt solid; BORDER-RIGHT: #bfbfbf 1pt solid; PADDING-BOTTOM: 0px; TEXT-ALIGN: center; PADDING-TOP: 32px; PADDING-LEFT: 22px; BORDER-LEFT: #bfbfbf 1pt solid; PADDING-RIGHT: 22px; BACKGROUND-COLOR: #ffffff; valign: bottom
          }
          TR.xdTitleRowWithSubHeading {
          MIN-HEIGHT: 75px
          }
          TD.xdTitleCellWithSubHeading {
          BORDER-TOP: #bfbfbf 1pt solid; BORDER-RIGHT: #bfbfbf 1pt solid; PADDING-BOTTOM: 6px; TEXT-ALIGN: center; PADDING-TOP: 32px; PADDING-LEFT: 22px; BORDER-LEFT: #bfbfbf 1pt solid; PADDING-RIGHT: 22px; BACKGROUND-COLOR: #ffffff; valign: bottom
          }
          TR.xdTitleRowWithOffsetBody {
          MIN-HEIGHT: 72px
          }
          TD.xdTitleCellWithOffsetBody {
          BORDER-TOP: #bfbfbf 1pt solid; BORDER-RIGHT: #bfbfbf 1pt solid; PADDING-BOTTOM: 2px; TEXT-ALIGN: left; PADDING-TOP: 32px; PADDING-LEFT: 22px; BORDER-LEFT: #bfbfbf 1pt solid; PADDING-RIGHT: 22px; BACKGROUND-COLOR: #ffffff; valign: bottom
          }
          TR.xdTitleHeadingRow {
          MIN-HEIGHT: 37px
          }
          TD.xdTitleHeadingCell {
          BORDER-RIGHT: #bfbfbf 1pt solid; PADDING-BOTTOM: 14px; TEXT-ALIGN: center; PADDING-TOP: 0px; PADDING-LEFT: 22px; BORDER-LEFT: #bfbfbf 1pt solid; PADDING-RIGHT: 22px; BACKGROUND-COLOR: #ffffff; valign: top
          }
          TR.xdTitleSubheadingRow {
          MIN-HEIGHT: 70px
          }
          TD.xdTitleSubheadingCell {
          BORDER-RIGHT: #bfbfbf 1pt solid; PADDING-BOTTOM: 16px; PADDING-TOP: 8px; PADDING-LEFT: 22px; BORDER-LEFT: #bfbfbf 1pt solid; PADDING-RIGHT: 22px; BACKGROUND-COLOR: #ffffff; valign: top
          }
          TD.xdVerticalFill {
          BORDER-TOP: #bfbfbf 1pt solid; BORDER-BOTTOM: #bfbfbf 1pt solid; BORDER-LEFT: #bfbfbf 1pt solid; BACKGROUND-COLOR: #0c0c0c
          }
          TD.xdTableContentCellWithVerticalOffset {
          BORDER-RIGHT: #bfbfbf 1pt solid; BORDER-BOTTOM: #bfbfbf 1pt solid; PADDING-BOTTOM: 2px; TEXT-ALIGN: left; PADDING-TOP: 32px; PADDING-LEFT: 95px; BORDER-LEFT: #bfbfbf 1pt solid; PADDING-RIGHT: 0px; BACKGROUND-COLOR: #ffffff; valign: bottom
          }
          TR.xdTableContentRow {
          MIN-HEIGHT: 140px
          }
          TD.xdTableContentCell {
          BORDER-RIGHT: #bfbfbf 1pt solid; BORDER-BOTTOM: #bfbfbf 1pt solid; PADDING-BOTTOM: 0px; PADDING-TOP: 0px; PADDING-LEFT: 0px; BORDER-LEFT: #bfbfbf 1pt solid; PADDING-RIGHT: 0px; BACKGROUND-COLOR: #ffffff; valign: top
          }
          TD.xdTableContentCellWithVerticalFill {
          BORDER-RIGHT: #bfbfbf 1pt solid; BORDER-BOTTOM: #bfbfbf 1pt solid; PADDING-BOTTOM: 0px; PADDING-TOP: 0px; PADDING-LEFT: 1px; BORDER-LEFT: #bfbfbf 1pt solid; PADDING-RIGHT: 1px; BACKGROUND-COLOR: #ffffff; valign: top
          }
          TD.xdTableStyleOneCol {
          PADDING-BOTTOM: 4px; PADDING-TOP: 4px; PADDING-LEFT: 22px; PADDING-RIGHT: 22px
          }
          TR.xdContentRowOneCol {
          MIN-HEIGHT: 45px; valign: center
          }
          TR.xdHeadingRow {
          MIN-HEIGHT: 27px
          }
          TD.xdHeadingCell {
          BORDER-TOP: #3f3f3f 1pt solid; BORDER-BOTTOM: #3f3f3f 1pt solid; PADDING-BOTTOM: 2px; TEXT-ALIGN: center; PADDING-TOP: 2px; PADDING-LEFT: 22px; PADDING-RIGHT: 22px; BACKGROUND-COLOR: #7f7f7f; valign: bottom
          }
          TR.xdSubheadingRow {
          MIN-HEIGHT: 28px
          }
          TD.xdSubheadingCell {
          BORDER-BOTTOM: #3f3f3f 1pt solid; PADDING-BOTTOM: 4px; TEXT-ALIGN: center; PADDING-TOP: 4px; PADDING-LEFT: 22px; PADDING-RIGHT: 22px; valign: bottom
          }
          TR.xdHeadingRowEmphasis {
          MIN-HEIGHT: 27px
          }
          TD.xdHeadingCellEmphasis {
          BORDER-TOP: #3f3f3f 1pt solid; BORDER-BOTTOM: #3f3f3f 1pt solid; PADDING-BOTTOM: 2px; TEXT-ALIGN: center; PADDING-TOP: 2px; PADDING-LEFT: 22px; PADDING-RIGHT: 22px; BACKGROUND-COLOR: #7f7f7f; valign: bottom
          }
          TR.xdSubheadingRowEmphasis {
          MIN-HEIGHT: 28px
          }
          TD.xdSubheadingCellEmphasis {
          BORDER-BOTTOM: #3f3f3f 1pt solid; PADDING-BOTTOM: 4px; TEXT-ALIGN: center; PADDING-TOP: 4px; PADDING-LEFT: 22px; PADDING-RIGHT: 22px; valign: bottom
          }
          TR.xdTableLabelControlStackedRow {
          MIN-HEIGHT: 45px
          }
          TD.xdTableLabelControlStackedCellLabel {
          PADDING-BOTTOM: 4px; PADDING-TOP: 4px; PADDING-LEFT: 22px; PADDING-RIGHT: 5px
          }
          TD.xdTableLabelControlStackedCellComponent {
          PADDING-BOTTOM: 4px; PADDING-TOP: 4px; PADDING-LEFT: 5px; PADDING-RIGHT: 22px
          }
          TR.xdTableRow {
          MIN-HEIGHT: 30px
          }
          TD.xdTableCellLabel {
          PADDING-BOTTOM: 4px; PADDING-TOP: 4px; PADDING-LEFT: 22px; PADDING-RIGHT: 5px
          }
          TD.xdTableCellComponent {
          PADDING-BOTTOM: 4px; PADDING-TOP: 4px; PADDING-LEFT: 5px; PADDING-RIGHT: 22px
          }
          TD.xdTableMiddleCell {
          PADDING-BOTTOM: 4px; PADDING-TOP: 4px; PADDING-LEFT: 5px; PADDING-RIGHT: 5px
          }
          TR.xdTableEmphasisRow {
          MIN-HEIGHT: 30px
          }
          TD.xdTableEmphasisCellLabel {
          PADDING-BOTTOM: 4px; PADDING-TOP: 4px; PADDING-LEFT: 22px; PADDING-RIGHT: 5px; BACKGROUND-COLOR: #595959
          }
          TD.xdTableEmphasisCellComponent {
          PADDING-BOTTOM: 4px; PADDING-TOP: 4px; PADDING-LEFT: 5px; PADDING-RIGHT: 22px; BACKGROUND-COLOR: #595959
          }
          TD.xdTableMiddleCellEmphasis {
          PADDING-BOTTOM: 4px; PADDING-TOP: 4px; PADDING-LEFT: 5px; PADDING-RIGHT: 5px; BACKGROUND-COLOR: #595959
          }
          TR.xdTableOffsetRow {
          MIN-HEIGHT: 30px
          }
          TD.xdTableOffsetCellLabel {
          PADDING-BOTTOM: 4px; PADDING-TOP: 4px; PADDING-LEFT: 22px; PADDING-RIGHT: 5px; BACKGROUND-COLOR: #595959
          }
          TD.xdTableOffsetCellComponent {
          PADDING-BOTTOM: 4px; PADDING-TOP: 4px; PADDING-LEFT: 5px; PADDING-RIGHT: 22px; BACKGROUND-COLOR: #595959
          }
          P {
          FONT-SIZE: 11pt; COLOR: #0c0c0c; MARGIN-TOP: 0px
          }
          H1 {
          MARGIN-BOTTOM: 0px; FONT-SIZE: 24pt; FONT-WEIGHT: normal; COLOR: #0c0c0c; MARGIN-TOP: 0px
          }
          H2 {
          MARGIN-BOTTOM: 0px; FONT-SIZE: 16pt; FONT-WEIGHT: bold; COLOR: #0c0c0c; MARGIN-TOP: 0px
          }
          H3 {
          MARGIN-BOTTOM: 0px; FONT-SIZE: 12pt; TEXT-TRANSFORM: uppercase; FONT-WEIGHT: normal; COLOR: #0c0c0c; MARGIN-TOP: 0px
          }
          H4 {
          MARGIN-BOTTOM: 0px; FONT-SIZE: 10pt; FONT-WEIGHT: normal; COLOR: #262626; FONT-STYLE: italic; MARGIN-TOP: 0px
          }
          H5 {
          MARGIN-BOTTOM: 0px; FONT-SIZE: 10pt; FONT-WEIGHT: bold; COLOR: #0c0c0c; FONT-STYLE: italic; MARGIN-TOP: 0px
          }
          H6 {
          MARGIN-BOTTOM: 0px; FONT-SIZE: 10pt; FONT-WEIGHT: normal; COLOR: #262626; MARGIN-TOP: 0px
          }
          BODY {
          COLOR: black
          }
        </style>
      </head>
      <body style="BACKGROUND-COLOR: #ffffff">
        <div align="center">
          <xsl:apply-templates select="." mode="_1"/>
        </div>
        <div> </div>
      </body>
    </html>
  </xsl:template>
  <xsl:template match="ns1:FormInformation" mode="_1">
    <div title="" class="xdSection xdRepeating" style="MARGIN-BOTTOM: 0px; BORDER-TOP: 0pt; BORDER-RIGHT: 0pt; BORDER-BOTTOM: 0pt; BORDER-LEFT: 0pt; WIDTH: 553px" align="left" xd:xctname="Section" xd:CtrlId="CTRL1" tabIndex="-1" xd:widgetIndex="0">
      <h1 style="FONT-WEIGHT: normal" align="center">InfoPath XSN Scan</h1>
      <div style="FONT-WEIGHT: normal" align="center"> </div>
      <div>
        <xsl:apply-templates select="ns1:DataConnections" mode="_2"/>
      </div>
      <div>
        <xsl:apply-templates select="ns1:FormProperties" mode="_5"/>
      </div>
      <div>
        <xsl:apply-templates select="ns1:PromotedProperties" mode="_6"/>
      </div>
      <div>
        <xsl:apply-templates select="ns1:ViewInfos" mode="_7"/>
      </div>
      <div> </div>
      <div> </div>
      <div> </div>
    </div>
  </xsl:template>
  <xsl:template match="ns1:DataConnections" mode="_2">
    <div title="" class="xdSection xdRepeating" style="MARGIN-BOTTOM: 0px; BORDER-TOP: #000000 1pt solid; BORDER-RIGHT: #000000 1pt solid; BORDER-BOTTOM: #000000 1pt solid; BORDER-LEFT: #000000 1pt solid; WIDTH: 550px" align="left" xd:xctname="Section" xd:CtrlId="CTRL2" tabIndex="-1" xd:widgetIndex="0">
      <h2 style="FONT-WEIGHT: normal">Data Connections</h2>
      <div style="FONT-WEIGHT: normal"> </div>
      <div>
        <xsl:apply-templates select="ns1:DataConnection" mode="_3"/>
      </div>
      <div> </div>
      <div> </div>
    </div>
  </xsl:template>
  <xsl:template match="ns1:DataConnection" mode="_3">
    <div title="" class="xdRepeatingSection xdRepeating" style="MARGIN-BOTTOM: 0px; WIDTH: 545px" align="left" xd:xctname="RepeatingSection" xd:CtrlId="CTRL3" tabIndex="-1" xd:widgetIndex="0">
      <div/>
      <h3 style="FONT-WEIGHT: normal">
        <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL10" xd:binding="ns1:Name" style="FONT-WEIGHT: bold; WIDTH: 307px">
          <xsl:value-of select="ns1:Name"/>
        </span>
      </h3>
      <div>
        <table class="xdFormLayout xdTableStyleTwoCol" style="BORDER-TOP-STYLE: none; WORD-WRAP: break-word; BORDER-LEFT-STYLE: none; BORDER-COLLAPSE: collapse; TABLE-LAYOUT: fixed; BORDER-BOTTOM-STYLE: none; BORDER-RIGHT-STYLE: none; WIDTH: 542px">
          <colgroup>
            <col style="WIDTH: 139px"></col>
            <col style="WIDTH: 403px"></col>
          </colgroup>
          <tbody vAlign="top">
            <tr class="xdTableRow">
              <td vAlign="top" style="BORDER-BOTTOM-COLOR: " class="xdTableCellLabel">
                <h4>Type</h4>
              </td>
              <td vAlign="top" style="BORDER-BOTTOM-COLOR: " class="xdTableCellComponent">
                <div>
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL4" xd:binding="ns1:ConnectionType" style="HEIGHT: 20px; WIDTH: 100%">
                    <xsl:value-of select="ns1:ConnectionType"/>
                  </span>
                </div>
              </td>
            </tr>
            <tr class="xdTableRow">
              <td vAlign="top" class="xdTableCellLabel">
                <h4>Query On Load</h4>
              </td>
              <td vAlign="top" class="xdTableCellComponent">
                <div>
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL11" xd:binding="ns1:QueryOnLoad" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:QueryOnLoad"/>
                  </span>
                </div>
              </td>
            </tr>
            <tr class="xdTableRow">
              <td vAlign="top" class="xdTableCellLabel">
                <h4>Udcx</h4>
              </td>
              <td vAlign="top" class="xdTableCellComponent">
                <div>
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL12" xd:binding="ns1:Udcx" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:Udcx"/>
                  </span>
                </div>
              </td>
            </tr>
            <tr class="xdTableRow">
              <td vAlign="top" style="BORDER-TOP-COLOR: " class="xdTableCellLabel">
                <h4>Default Submit</h4>
              </td>
              <td vAlign="top" style="BORDER-TOP-COLOR: " class="xdTableCellComponent">
                <div>
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL9" xd:binding="ns1:DefaultSubmit" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:DefaultSubmit"/>
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div> </div>
      <h4 style="FONT-WEIGHT: normal">
        <strong>Properties</strong>
      </h4>
      <div>
        <xsl:apply-templates select="ns1:DataConnectionProperties" mode="_4"/>
      </div>
      <div>
        <hr/>
      </div>
    </div>
  </xsl:template>
  <xsl:template match="ns1:DataConnectionProperties" mode="_4">
    <div title="" class="xdSection xdRepeating" style="MARGIN-BOTTOM: 0px; BORDER-TOP: 0pt; BORDER-RIGHT: 0pt; BORDER-BOTTOM: 0pt; BORDER-LEFT: 0pt; WIDTH: 535px" align="left" xd:xctname="Section" xd:CtrlId="CTRL5" tabIndex="-1" xd:widgetIndex="0">
      <div>
        <table title="" class="xdRepeatingTable msoUcTable" style="BORDER-TOP-STYLE: none; WORD-WRAP: break-word; BORDER-LEFT-STYLE: none; BORDER-COLLAPSE: collapse; TABLE-LAYOUT: fixed; BORDER-BOTTOM-STYLE: none; BORDER-RIGHT-STYLE: none; WIDTH: 532px" border="1" xd:CtrlId="CTRL6" xd:widgetIndex="0">
          <colgroup>
            <col style="WIDTH: 194px"></col>
            <col style="WIDTH: 338px"></col>
          </colgroup>
          <tbody class="xdTableHeader">
            <tr style="MIN-HEIGHT: 19px">
              <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; TEXT-ALIGN: center; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                <div>
                  <h5 style="FONT-WEIGHT: normal">
                    <strong>Name</strong>
                  </h5>
                </div>
              </td>
              <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; TEXT-ALIGN: center; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                <div>
                  <h5 style="FONT-WEIGHT: normal">
                    <strong>Value</strong>
                  </h5>
                </div>
              </td>
            </tr>
          </tbody>
          <tbody xd:xctname="RepeatingTable">
            <xsl:for-each select="ns1:Property">
              <tr>
                <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL7" xd:binding="ns1:Name" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:Name"/>
                  </span>
                </td>
                <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL8" xd:binding="ns1:Value" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:Value"/>
                  </span>
                </td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </div>
      <div> </div>
    </div>
  </xsl:template>
  <xsl:template match="ns1:FormProperties" mode="_5">
    <div title="" class="xdSection xdRepeating" style="MARGIN-BOTTOM: 0px; BORDER-TOP: 0pt; BORDER-RIGHT: 0pt; BORDER-BOTTOM: 0pt; BORDER-LEFT: 0pt; WIDTH: 550px" align="left" xd:xctname="Section" xd:CtrlId="CTRL13" tabIndex="-1" xd:widgetIndex="0">
      <h2 style="FONT-WEIGHT: normal">Form Properties</h2>
      <div>
        <table title="" class="xdRepeatingTable msoUcTable" style="BORDER-TOP-STYLE: none; WORD-WRAP: break-word; BORDER-LEFT-STYLE: none; BORDER-COLLAPSE: collapse; TABLE-LAYOUT: fixed; BORDER-BOTTOM-STYLE: none; BORDER-RIGHT-STYLE: none; WIDTH: 540px" border="1" xd:CtrlId="CTRL14" xd:widgetIndex="0">
          <colgroup>
            <col style="WIDTH: 192px"></col>
            <col style="WIDTH: 348px"></col>
          </colgroup>
          <tbody class="xdTableHeader">
            <tr>
              <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; TEXT-ALIGN: center; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                <div>
                  <h5 style="FONT-WEIGHT: normal">
                    <strong>Name</strong>
                  </h5>
                </div>
              </td>
              <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; TEXT-ALIGN: center; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                <div>
                  <h5 style="FONT-WEIGHT: normal">
                    <strong>Value</strong>
                  </h5>
                </div>
              </td>
            </tr>
          </tbody>
          <tbody xd:xctname="RepeatingTable">
            <xsl:for-each select="ns1:Property">
              <tr>
                <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL15" xd:binding="ns1:Name" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:Name"/>
                  </span>
                </td>
                <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL16" xd:binding="ns1:Value" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:Value"/>
                  </span>
                </td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </div>
      <div>
        <hr/>
      </div>
      <div> </div>
      <div> </div>
    </div>
  </xsl:template>
  <xsl:template match="ns1:PromotedProperties" mode="_6">
    <div title="" class="xdSection xdRepeating" style="MARGIN-BOTTOM: 0px; BORDER-TOP: 0pt; BORDER-RIGHT: 0pt; BORDER-BOTTOM: 0pt; BORDER-LEFT: 0pt; WIDTH: 100%" align="left" xd:xctname="Section" xd:CtrlId="CTRL17" tabIndex="-1" xd:widgetIndex="0">
      <h2 style="FONT-WEIGHT: normal">Promoted Properties</h2>
      <div>
        <table title="" class="xdRepeatingTable msoUcTable" style="BORDER-TOP-STYLE: none; WORD-WRAP: break-word; BORDER-LEFT-STYLE: none; BORDER-COLLAPSE: collapse; TABLE-LAYOUT: fixed; BORDER-BOTTOM-STYLE: none; BORDER-RIGHT-STYLE: none; WIDTH: 540px" border="1" xd:CtrlId="CTRL18" xd:widgetIndex="0">
          <colgroup>
            <col style="WIDTH: 135px"></col>
            <col style="WIDTH: 135px"></col>
            <col style="WIDTH: 135px"></col>
            <col style="WIDTH: 135px"></col>
          </colgroup>
          <tbody class="xdTableHeader">
            <tr>
              <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; TEXT-ALIGN: center; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                <div>
                  <h5 style="FONT-WEIGHT: normal">
                    <strong>Name</strong>
                  </h5>
                </div>
              </td>
              <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; TEXT-ALIGN: center; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                <div>
                  <h5 style="FONT-WEIGHT: normal">
                    <strong>Data Type</strong>
                  </h5>
                </div>
              </td>
              <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; TEXT-ALIGN: center; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                <div>
                  <h5 style="FONT-WEIGHT: normal">
                    <strong>Aggregation</strong>
                  </h5>
                </div>
              </td>
              <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; TEXT-ALIGN: center; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                <div>
                  <h5 style="FONT-WEIGHT: normal">
                    <strong>Node Path</strong>
                  </h5>
                </div>
              </td>
            </tr>
          </tbody>
          <tbody xd:xctname="RepeatingTable">
            <xsl:for-each select="ns1:PromotedProperty">
              <tr>
                <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL21" xd:binding="ns1:Name" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:Name"/>
                  </span>
                </td>
                <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL20" xd:binding="ns1:DataType" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:DataType"/>
                  </span>
                </td>
                <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL19" xd:binding="ns1:Aggregation" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:Aggregation"/>
                  </span>
                </td>
                <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL22" xd:binding="ns1:NodePath" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:NodePath"/>
                  </span>
                </td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </div>
      <div> </div>
      <div> </div>
      <div> </div>
    </div>
  </xsl:template>
  <xsl:template match="ns1:ViewInfos" mode="_7">
    <div title="" class="xdSection xdRepeating" style="MARGIN-BOTTOM: 0px; BORDER-TOP: 0pt; BORDER-RIGHT: 0pt; BORDER-BOTTOM: 0pt; BORDER-LEFT: 0pt; WIDTH: 100%" align="left" xd:xctname="Section" xd:CtrlId="CTRL23" tabIndex="-1" xd:widgetIndex="0">
      <h2 style="FONT-WEIGHT: normal">Views</h2>
      <div>
        <table title="" class="xdRepeatingTable msoUcTable" style="BORDER-TOP-STYLE: none; WORD-WRAP: break-word; BORDER-LEFT-STYLE: none; BORDER-COLLAPSE: collapse; TABLE-LAYOUT: fixed; BORDER-BOTTOM-STYLE: none; BORDER-RIGHT-STYLE: none; WIDTH: 546px" border="1" xd:CtrlId="CTRL28" xd:widgetIndex="0">
          <colgroup>
            <col style="WIDTH: 182px"></col>
            <col style="WIDTH: 182px"></col>
            <col style="WIDTH: 182px"></col>
          </colgroup>
          <tbody class="xdTableHeader">
            <tr>
              <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; TEXT-ALIGN: center; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                <div>
                  <h5 style="FONT-WEIGHT: normal">
                    <strong>Name</strong>
                  </h5>
                </div>
              </td>
              <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; TEXT-ALIGN: center; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                <div>
                  <h5 style="FONT-WEIGHT: normal">
                    <strong>Length</strong>
                  </h5>
                </div>
              </td>
              <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; TEXT-ALIGN: center; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                <div>
                  <h5 style="FONT-WEIGHT: normal">
                    <strong>Size</strong>
                  </h5>
                </div>
              </td>
            </tr>
          </tbody>
          <tbody xd:xctname="RepeatingTable">
            <xsl:for-each select="ns1:ViewInfo">
              <tr>
                <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL30" xd:binding="ns1:Name" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:Name"/>
                  </span>
                </td>
                <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL29" xd:binding="ns1:Length" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:Length"/>
                  </span>
                </td>
                <td style="BORDER-RIGHT: medium none; PADDING-BOTTOM: 1px; PADDING-TOP: 1px; PADDING-LEFT: 5px; BORDER-LEFT: medium none; PADDING-RIGHT: 5px">
                  <span title="" class="xdTextBox" hideFocus="1" tabIndex="0" xd:xctname="PlainText" xd:CtrlId="CTRL31" xd:binding="ns1:Size" style="WIDTH: 100%">
                    <xsl:value-of select="ns1:Size"/>
                  </span>
                </td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </div>
      <div> </div>
      <div> </div>
      <div> </div>
    </div>
  </xsl:template>
</xsl:stylesheet>

