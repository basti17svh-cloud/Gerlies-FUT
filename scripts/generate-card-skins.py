"""Generate the four blank metallic Footera card skins.

Only the surface and frame live in these SVGs. Rating, position, badges,
portrait, name and attributes are always rendered by cardHTML in index.html.
"""

from pathlib import Path


OUT = Path(__file__).resolve().parents[1] / "assets" / "footera"
OUTER = (
    "M350 3 373 31Q390 52 412 54L588 55 640 78 674 120 674 850"
    "Q661 889 620 918L350 995 80 918Q39 889 26 850L26 120 60 78"
    " 112 55 288 54Q310 52 327 31Z"
)
INNER = (
    "M350 24 376 53Q390 66 412 68L582 70 628 91 654 129 654 842"
    "Q643 874 608 898L350 970 92 898Q57 874 46 842L46 129 72 91"
    " 118 70 288 68Q310 66 324 53Z"
)
PALETTES = {
    "gold": dict(edge="#fff3bd", edge_mid="#b67921", edge_dark="#5a360e",
                 inside="#2b1a09", inside_mid="#6c4817", inside_light="#b58230",
                 facet="#ffdc7b", facet_dark="#6a3d12", glint="#fff5ce"),
    "silver": dict(edge="#f8feff", edge_mid="#91a7b4", edge_dark="#344651",
                   inside="#111c27", inside_mid="#3a4c5c", inside_light="#849aa7",
                   facet="#d5e6ef", facet_dark="#26394a", glint="#ffffff"),
    "bronze": dict(edge="#ffdbad", edge_mid="#af643a", edge_dark="#51291b",
                   inside="#25130e", inside_mid="#6b3522", inside_light="#a9663d",
                   facet="#e9a36b", facet_dark="#51291d", glint="#ffdcbb"),
    "totw": dict(edge="#ffedac", edge_mid="#b37a19", edge_dark="#49300a",
                 inside="#030507", inside_mid="#16191a", inside_light="#3d3420",
                 facet="#e3b849", facet_dark="#15120b", glint="#fff2c0"),
}


def skin(theme: str, p: dict[str, str]) -> str:
    # All paths and proportions deliberately match across the four cards.
    facets = f"""
    <path d="M95 88 309 81 177 287 60 221Z" fill="{p['facet']}" opacity=".18"/>
    <path d="M309 81 490 82 334 257 177 287Z" fill="{p['glint']}" opacity=".11"/>
    <path d="M490 82 630 94 596 314 334 257Z" fill="{p['facet_dark']}" opacity=".46"/>
    <path d="M60 221 177 287 92 490 48 563Z" fill="{p['facet_dark']}" opacity=".47"/>
    <path d="M177 287 334 257 210 467 92 490Z" fill="{p['glint']}" opacity=".08"/>
    <path d="M334 257 596 314 449 512 210 467Z" fill="{p['facet']}" opacity=".11"/>
    <path d="M596 314 653 161 652 615 449 512Z" fill="{p['glint']}" opacity=".07"/>
    <path d="M92 490 210 467 54 694Z" fill="{p['facet']}" opacity=".10"/>
    <path d="M449 512 652 615 614 730 285 675Z" fill="{p['facet_dark']}" opacity=".4"/>
    <path d="M54 694 285 675 350 821 76 780Z" fill="{p['facet_dark']}" opacity=".38"/>
    <path d="M285 675 614 730 624 817 350 821Z" fill="{p['facet']}" opacity=".09"/>
    <path d="M76 780 350 821 115 887Z" fill="{p['glint']}" opacity=".08"/>
    <path d="M350 821 624 817 585 894 350 956 115 887Z" fill="{p['facet_dark']}" opacity=".3"/>
    <path d="M62 500 303 82M95 490 490 82M203 466 596 314M86 785 350 821 622 816"
          fill="none" stroke="{p['glint']}" stroke-width="2" opacity=".12"/>
    """
    lightning = ""
    if theme == "totw":
        lightning = f"""
        <path d="M578 83 393 334 478 312 338 590 612 271 519 296 636 87Z"
              fill="{p['facet']}" opacity=".25"/>
        <path d="M600 111 424 344 506 317 388 506"
              fill="none" stroke="{p['glint']}" stroke-width="7" opacity=".38"/>
        <path d="M96 612 261 472 217 575 374 432"
              fill="none" stroke="{p['facet']}" stroke-width="4" opacity=".27"/>
        """
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 1000" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="rim" x1="0" x2="1" y1="0" y2="1">
      <stop stop-color="{p['edge_dark']}"/>
      <stop offset=".16" stop-color="{p['edge']}"/>
      <stop offset=".34" stop-color="{p['edge_mid']}"/>
      <stop offset=".55" stop-color="{p['edge']}"/>
      <stop offset=".75" stop-color="{p['edge_dark']}"/>
      <stop offset=".92" stop-color="{p['edge']}"/>
    </linearGradient>
    <linearGradient id="field" x1="0" x2="1" y1="0" y2="1">
      <stop stop-color="{p['inside']}"/>
      <stop offset=".28" stop-color="{p['inside_mid']}"/>
      <stop offset=".58" stop-color="{p['inside_light']}"/>
      <stop offset=".82" stop-color="{p['inside_mid']}"/>
      <stop offset="1" stop-color="{p['inside']}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" x2="1" y1="0" y2=".6">
      <stop stop-color="{p['glint']}" stop-opacity=".22"/>
      <stop offset=".55" stop-color="{p['glint']}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="base" x1="0" x2="0" y1="0" y2="1">
      <stop stop-color="{p['inside']}" stop-opacity="0"/>
      <stop offset=".53" stop-color="{p['inside']}" stop-opacity=".63"/>
      <stop offset="1" stop-color="{p['inside']}" stop-opacity=".95"/>
    </linearGradient>
    <pattern id="mesh" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M0 0 24 24M24 0 0 24" fill="none" stroke="{p['glint']}" stroke-opacity=".045" stroke-width="1"/>
    </pattern>
    <clipPath id="cut"><path d="{INNER}"/></clipPath>
  </defs>
  <path d="{OUTER}" fill="url(#rim)"/>
  <path d="{INNER}" fill="url(#field)"/>
  <g clip-path="url(#cut)">
    <path d="{INNER}" fill="url(#mesh)"/>
    {facets}
    {lightning}
    <path d="M32 64H669V522H32Z" fill="url(#shine)"/>
    <path d="M39 594H663V963H39Z" fill="url(#base)"/>
    <path d="M76 688H624" stroke="{p['edge']}" stroke-opacity=".48" stroke-width="2"/>
    <path d="M90 911Q350 970 610 911" fill="none" stroke="{p['glint']}" stroke-opacity=".25" stroke-width="2"/>
  </g>
  <path d="{OUTER}" fill="none" stroke="{p['glint']}" stroke-opacity=".84" stroke-width="3"/>
  <path d="{INNER}" fill="none" stroke="{p['edge_dark']}" stroke-width="12"/>
  <path d="{INNER}" fill="none" stroke="{p['edge']}" stroke-opacity=".88" stroke-width="4"/>
  <path d="M73 130 87 101 121 83 286 81Q314 79 331 61L350 43 369 61Q386 79 414 81L579 83 613 101 627 130"
        fill="none" stroke="{p['glint']}" stroke-opacity=".44" stroke-width="2"/>
  <path d="M76 823 93 879Q110 902 139 912L350 978 561 912Q590 902 607 879L624 823"
        fill="none" stroke="{p['glint']}" stroke-opacity=".52" stroke-width="2"/>
</svg>
'''


if __name__ == "__main__":
    for name, palette in PALETTES.items():
        svg = "\n".join(line.rstrip() for line in skin(name, palette).splitlines()) + "\n"
        (OUT / f"card-{name}-metallic.svg").write_text(svg, encoding="utf-8")
