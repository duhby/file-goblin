# File Goblin

File Goblin helps easily organize, search with hierarchical tags, and share media. Whether that's images, memes, videos, links, etc.

## Developing

```sh
bun --env-file=.env dev
```

## Link Formatting

- Possibly use same id system as youtube, or at least a case insensitive version so the urls are short
- Have urls be like cdn.example.com/4x10-t/cool-video.mp4 where anything after the id is ignored by the cf worker
