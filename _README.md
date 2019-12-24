# remark-mermaid

render inline mermaid diagrams! take code blocks like this:

~~~markdown
```mermaid file=example.svg name=Example_Diagram
graph TD;
  A-->B;
  A-->C;
  B-->D;
  C-->D
```
~~~

and turn them into this (!):

![example.svg]

[example.svg]: example.svg

## options
all mermaid blocks that don't have `file` and `name` are skipped. It's also possible
to specify an `alt` tag. I'm not yet sure how I want to handle spaces.


## how to use it
honestly i am tired as hell but you can look at [src/mermaidRender.spec.ts]

[src/mermaidRender.spec.ts]: src/mermaidRender.spec.ts 