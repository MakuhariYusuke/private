# Page snapshot

```yaml
- main [ref=e2]:
  - img [ref=e3]
  - 'heading "404: Not found" [level=1] [ref=e7]':
    - generic [ref=e8]: "404:"
    - generic [ref=e9]: Not found
  - paragraph [ref=e10]:
    - text: In your
    - code [ref=e11]: site
    - text: you have your base path set to
    - link /private/ [ref=e12] [cursor=pointer]:
      - /url: /private/
    - text: . Do you want to go there instead?
  - paragraph [ref=e13]:
    - text: Come to our
    - link "Discord" [ref=e14] [cursor=pointer]:
      - /url: https://astro.build/chat
    - text: if you need help.
```