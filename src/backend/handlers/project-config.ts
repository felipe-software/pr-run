import {
    addProjectToConfig,
    findProject,
    readConfig,
} from "@/backend/config-store";

export const projectConfigHandler = {
    addProject: addProjectToConfig,
    findProject,
    readConfig,
};
