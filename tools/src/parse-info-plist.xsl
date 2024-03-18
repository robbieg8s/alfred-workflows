<?xml version="1.0"?>
<!-- Emit lines of the form 'key value' for js to parse, where the key part has no spaces -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="text"/>
  <xsl:strip-space elements="*"/>
  <xsl:template match="/">
    <!-- Find the keys we care about - bundleid, name, version - where the following value node
      is a non-empty <string> element. -->
    <xsl:for-each select="plist/dict/key[
        (text()[.='bundleid' or .='name' or .='version']) and
        following-sibling::*[1][self::string and text()]
        ]">
      <!-- key -->
      <xsl:value-of select="text()"/>
      <!-- space -->
      <xsl:text>&#x20;</xsl:text>
      <!-- value -->
      <!-- Note that the normalize-space here is really to ensure there are no newlines in the value -->
      <xsl:value-of select="normalize-space(following-sibling::*[1]/text())"/>
      <!-- newline -->
      <xsl:text>&#xa;</xsl:text>
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>
