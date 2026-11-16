"""Clean-shaven head skin for the realistic body (V21.433): the source head
texture carries a painted moustache, goatee and stubble, so every player had
the same beard. Beards now come from the separate beard meshes, per player.

The texture is upside down (chin at the top). Inside the beard area every
pixel darker than the clean cheek skin next to it is pulled back to that
skin, keeping the skin's own fine grain; lips, nostrils and eyes stay."""
import numpy as np
from PIL import Image, ImageFilter


def shave(img):
    a = np.asarray(img.convert('RGB')).astype(np.float32); H, W = a.shape[:2]
    y, x = np.mgrid[0:H, 0:W] / np.array([H, W])[:, None, None]
    # Beard area (UV fractions of this source's head layout).
    side = (x < .34) | (x > .66)
    area = (y > .03) & (x > .17) & (x < .83) & ((y < .27) | (side & (y < .40)))
    lips = (((x - .5) / .085) ** 2 + ((y - .185) / .042) ** 2) < 1
    area &= ~(lips & (a[..., 0] - a[..., 1] > 38))                       # red lip skin
    area &= ~((x > .43) & (x < .57) & (y > .25))                         # nostrils
    soft = np.asarray(Image.fromarray(area.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(H / 90))).astype(np.float32) / 255
    soft = np.minimum(soft, area * 1.)
    # Clean skin: the cheek tone (the texture carries almost no shading),
    # blended a little towards the local bright skin so the jaw keeps its warmth.
    lum = a @ np.array([.299, .587, .114])
    cheek = a[int(.44 * H):int(.56 * H), int(.12 * W):int(.30 * W)].reshape(-1, 3)
    tone = np.median(cheek, 0); tone_l = float(tone @ np.array([.299, .587, .114]))
    grain = a - np.asarray(img.convert('RGB').filter(ImageFilter.GaussianBlur(3))).astype(np.float32)
    clean = np.broadcast_to(tone, a.shape)
    dark = np.clip((tone_l - lum) / 25, 0, 1)                                  # how much beard here
    w = (soft * np.maximum(dark, .5))[..., None]
    out = a * (1 - w) + (clean + np.clip(grain, -6, 6) * .6) * w
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


if __name__ == '__main__':
    import sys
    shave(Image.open(sys.argv[1])).save(sys.argv[2])
