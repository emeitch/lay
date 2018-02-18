/* eslint-env browser */
import Book from './book';
import { exp } from './exp';
import { path } from './path';
import { func, concat, LiftedNative } from './func';
import v from './v';

const d = new Book();

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
  d.put(Task, "complete", path("self", ["set", "state", "completed"]));
  d.set("Task", Task);
}

{
  const vtasks = path("Task", "all").reduce(d);
  {
    d.run(path(vtasks, ["map", func("tid", new LiftedNative(function(tid) {
      return path(tid, "complete").reduce(this);
    }))]).reduce(d));
  }

  {
    const sep = path("Console", ["puts", v("-----------")]);
    d.run(path(vtasks, ["map", func("tid",
      exp("then",
        exp("then",
          path("Console",
            ["puts",
              exp(concat,
                v("tag: "),
                path("tid", "tag"))]),
          path("Console",
            ["puts",
              exp(concat,
                v("state: "),
                path("tid", "state"))])),
      sep))]).reduce(d));
  }
}
