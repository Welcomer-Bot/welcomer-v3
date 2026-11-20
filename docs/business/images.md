# Custom images

The picture the bot generates for each member, with their avatar and name.

## Rules

### Library

- **R-IMG-1** Each server has an image library of up to 5 images. A manager creates images in it, then selects one in a configuration. The same image can serve several configurations.
- **R-IMG-2** An image has a name: required, 50 characters at most, unique in the library. Spaces at the start and end are removed; case counts.
- **R-IMG-3** A manager can delete an image in use. The dashboard first warns which configurations use it. After deletion, those configurations are sent without an image.

### Generation

- **R-IMG-4** The bot generates the image for each member when it posts the message.
- **R-IMG-5** If the bot cannot generate the image, the message is sent without it. In the first embed, that embed keeps its own image link if it has one.

### Size and layout

- **R-IMG-6** The generated image is 800 × 350 pixels.
- **R-IMG-7** A manager chooses one of three layouts. The layout fixes the position and size of every element; the manager does not move them.

  | Layout | Avatar               | Texts           |
  | ------ | -------------------- | --------------- |
  | Left   | on the left          | on the right    |
  | Center | centered, at the top | centered, below |
  | Right  | on the right         | on the left     |

  Positions in pixels, from the top left corner. A text position is its baseline; its width is the widest it may be before it shrinks (R-IMG-12).

  | Element  | Left                                  | Center                              | Right                                 |
  | -------- | ------------------------------------- | ----------------------------------- | ------------------------------------- |
  | Avatar   | circle of 200, top left at 50, 75     | circle of 140, top left at 330, 50  | circle of 200, top left at 550, 75    |
  | Title    | starts at x 290, baseline 140, width 470 | centered on x 400, baseline 225, width 600 | ends at x 510, baseline 140, width 470 |
  | Name     | starts at x 290, baseline 190, width 470 | centered on x 400, baseline 265, width 700 | ends at x 510, baseline 190, width 470 |
  | Subtitle | starts at x 290, baseline 240, width 470 | centered on x 400, baseline 310, width 700 | ends at x 510, baseline 240, width 470 |

### Avatar

- **R-IMG-8** The avatar is the member's, always round, with a border of 2 pixels whose color the manager chooses. Default border color: white (#FFFFFF).
- **R-IMG-9** A member without an avatar gets Discord's default avatar.

### Texts

- **R-IMG-10** The image holds the member's name and up to two free texts: a title and a subtitle. Each one can be hidden. The name always shows `{{member.displayName}}` and cannot be edited; its style can (R-IMG-13).
- **R-IMG-11** Each free text holds free text and [variables](./messages.md#variables), 100 characters at most. In an image, `{{member.mention}}` is replaced by "@" followed by the member's display name, since a mention cannot show as a mention in an image.
- **R-IMG-12** A text too long for its area is shrunk to fit, down to 20 pixels, then cut with "…".
- **R-IMG-13** For each text, the manager chooses a color, a font, a weight (normal or bold) and a size (small, medium or large). Sizes in pixels, and defaults of a new image:

  | Text     | Small | Medium | Large | Default content                         | Default style            |
  | -------- | ----- | ------ | ----- | --------------------------------------- | ------------------------ |
  | Title    | 36    | 48     | 60    | `Welcome to {{server.name}}`            | white, Nunito, bold, medium |
  | Name     | 26    | 35     | 44    | `{{member.displayName}}` (fixed)        | white, Nunito, bold, medium |
  | Subtitle | 25    | 33     | 41    | `You are member #{{server.memberCount}}` | white, Nunito, normal, medium |
- **R-IMG-14** Fonts: Nunito (default), Montserrat, Poppins, Lato, Open Sans. All are under a free license.

### Background

- **R-IMG-15** The background is Welcomer's default background, a solid color, or an image given by a link. Welcomer keeps only the link, never the image itself.
- **R-IMG-16** A background link is a web link (http or https) to a PNG, JPEG or WebP image of 8 MB at most. The image is cropped to cover the whole generated image.
- **R-IMG-17** The dashboard tests the link when the manager enters it, and warns without blocking if it does not work.
- **R-IMG-18** When the bot generates the image, it waits at most 3 seconds for the background. If the link does not work in time, or no background is chosen, the bot uses Welcomer's default background. That background is a picture shipped with Welcomer ([default background](../assets/default-background.jpg), 800 × 350), so it never fails. A new image starts with it.

### Place in the message

- **R-IMG-19** A configuration that uses an image chooses where it goes: attached under the message, or as the image of the first embed. In the first embed, it replaces that embed's image. The first-embed choice is offered only when the message has an embed. If the last embed is removed while the image goes in the first embed, the configuration cannot be validated until the manager moves the image under the message.

## Examples

```gherkin
Rule: R-IMG-3 Deleting an image in use

  Example: Two configurations use the image
    Given the image "Banner" is used by the configurations "Summer" and "Bye"
    When the manager deletes "Banner"
    Then the dashboard first warns that "Summer" and "Bye" use it
    And after confirmation, "Summer" and "Bye" are posted without an image

Rule: R-IMG-18 Background fallback

  Example: Background link too slow
    Given the image background link answers after 5 seconds
    When a member joins
    Then the image is generated with Welcomer's default background

  Example: Background link gone
    Given the image background link returns nothing
    When a member joins
    Then the image is generated with Welcomer's default background

Rule: R-IMG-19 Image in the first embed

  Example: First embed already has an image
    Given the configuration puts the custom image in the first embed
    And the first embed has its own image link
    When a member joins
    Then the first embed shows the custom image instead of its own image

  Example: Last embed removed
    Given the configuration puts the custom image in the first embed
    When the manager removes the only embed
    Then the dashboard refuses to validate
    And it asks to place the image under the message

Rule: R-IMG-11 Mention in an image

  Example: Mention in the title
    Given the image title is "Welcome {{member.mention}}"
    And the member's display name is "Sam"
    When the image is generated
    Then the title reads "Welcome @Sam"
```
