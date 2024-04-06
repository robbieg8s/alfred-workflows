<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output
    doctype-public="-//Apple//DTD PLIST 1.0//EN"
    doctype-system="http://www.apple.com/DTDs/PropertyList-1.0.dtd"
    encoding="UTF-8"
    indent="yes"
  />

  <!-- By default, copy everything through. -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

  <!--
    Empty string elements have an empty comment inserted, which is a hack that
    results in xsltproc rendering them as <string></string> and not <string/>.
  -->
  <xsl:template match="string[.='']">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:comment/>
    </xsl:copy>
  </xsl:template>

  <!--
    Finally, bump the patch version component in the version key's string value.
  -->
  <xsl:template match="plist/dict/string[preceding-sibling::key[1][text()[.='version']]]">
    <string>
      <xsl:value-of select="concat(
        substring-before(.,'.'),
        '.',
        substring-before(substring-after(.,'.'),'.'),
        '.',
        1+substring-after(substring-after(.,'.'),'.'))"
      />
    </string>
  </xsl:template>

</xsl:stylesheet>
