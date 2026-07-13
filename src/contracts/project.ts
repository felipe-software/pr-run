import * as Schema from "effect/Schema";

const ProjectConfigSchema = Schema.mutable(
    Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        path: Schema.String,
    }),
);

export type ProjectConfig = typeof ProjectConfigSchema.Type;

const ProjectGroupSchema = Schema.mutable(
    Schema.Struct({
        collapsed: Schema.Boolean,
        id: Schema.String,
        name: Schema.String,
        projects: Schema.mutable(Schema.Array(ProjectConfigSchema)),
    }),
);

export type ProjectGroup = typeof ProjectGroupSchema.Type;

export const ProjectsConfigSchema = Schema.mutable(
    Schema.Struct({
        groups: Schema.mutable(Schema.Array(ProjectGroupSchema)),
    }),
);

export type ProjectsConfig = typeof ProjectsConfigSchema.Type;
