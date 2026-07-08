ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id");
