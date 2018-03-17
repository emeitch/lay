/* eslint-env browser */
import Book from './book';
import { stdlib } from './stdlib';
import { exp } from './exp';
import { path } from './path';
import { func, concat } from './func';
import v from './v';
import { dom, e } from './dom';

const d = new Book(stdlib);

{
  const id = d.new();
  d.put(id, "tag", "Task");
  d.put(id, "title", v("buy the milk"));
  d.put(id, "state", "active");
}

{
  const id = d.new();
  d.put(id, "tag", "Task");
  d.put(id, "title", v("buy the beer"));
  d.put(id, "state", "active");
}

{
  const id = d.new();
  d.put(id, "tag", "Task");
  d.put(id, "title", v("buy the wine"));
  d.put(id, "state", "active");
}

d.existsIDs().forEach(i => {
  const logs = d.findLogs({id: i});
  logs.forEach(l => {
    console.log(l.key.stringify(), ":", l.val.stringify());
  });
  console.log("----------");
});

{
  const Task = d.new();
  d.put(Task,
    "toggle",
    exp("if",
      path("self", "state", ["equals", "active"]),
      path("self", ["set", "state", "completed"]),
      path("self", ["set", "state", "active"])
    )
  );
  d.set("Task", Task);
}

{
  const todos = d.new();
  d.put(todos, "tag", "App");
  d.put(todos, "state", "All");
  d.put(todos, "changeState", func("s", path("self", ["set", "state", "s"])));

  console.log(path(todos, "state").reduce(d));
  console.log("chage state");
  d.run(path(todos, ["changeState", "Active"]));
  console.log(path(todos, "state").reduce(d));
  console.log("----------");
}

{
  const vtasks = path("Task", "all");

  // {
  //   d.run(path(vtasks, ["map", func("tid", path("tid", "toggle"))]));
  // }

  {
    d.run(path(vtasks, ["map", func("tid",
      path(
        "Console",
        ["puts",
          exp(concat,
            v("tag: "),
            path("tid", "tag"))],
        ["then",
          path("Console",
            ["puts",
              exp(concat,
                v("state: "),
                path("tid", "state"))])
        ],
        ["then",
          path("Console", ["puts", v("-----------")])
        ]
    ))]));
  }
}

{
  d.import(dom);
  const domtree = e.body({},
    e.section({class: "todoapp"},
      e.div(
        e.header({class: "header"},
          e.h1(
            v("todos")
          ),
          e.input({class: "new-todo",
            placeholder: "What needs to be done?"})
        ),
        e.section({class: "main"},
          e.input({class: "toggle-all", type: "checkbox"}),
          e.ul({class: "todo-list",
            children:
              path("Task", "all", ["map", func("tid",
                e.li(
                  e.div({class: "view"},
                    e.input({
                      class: "toggle",
                      type: "checkbox",
                      checked: path("tid", "state", ["equals", "completed"]),
                      onchange:
                        func("el",
                          path(
                            "tid", "toggle",
                            // ["then",
                            //   path("Console",
                            //     ["puts", "tid"])],
                            ["then",
                              path("Console",
                                ["puts", path("tid", "state")])]
                          )
                        )
                    }),
                    e.label(path("tid", "title")),
                    e.button({class: "destroy"})
                  ),
                  e.input({class: "edit", value: "buy the milk"})
                )
              )])
            }
          )
        ),
        e.footer({class: "footer"},
          e.span({class: "todo-count"},
            e.strong(path("Task", "all", "count", "toStr")),
            e.span(v(" ")),
            e.span(v("items")),
            e.span(v(" left"))
          ),
          e.ul({class: "filters"},
            e.li(
              e.a({href: "#/", class: "selected"},
                v("All")
              )
            ),
            e.li(
              e.a({href: "#/active"},
                v("Active")
              )
            ),
            e.li(
              e.a({href: "#/completed"},
                v("Completed")
              )
            )
          )
        )
      )
    ),
    e.footer({class: "info"},
      e.p(
        v("Double-click to edit a todo")
      ),
      e.p(
        v("Created by "),
        e.a({href: "https://github.com/emeitch"},
          v("emeitch")
        )
      ),
      e.p(
        v("Part of "),
        e.a({href: "http://todomvc.com/"},
          v("TodoMVC")
        )
      )
    )
  );

  d.set("dom", domtree);

  setTimeout(() => {
    const id = d.new();
    d.put(id, "tag", "Task");
    d.put(id, "title", v("buy the coffee"));
    d.put(id, "state", "active");
  }, 1000);
}
