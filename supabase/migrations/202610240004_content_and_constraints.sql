alter table public.children add constraint child_city_length check(length(trim(city)) between 1 and 100);
alter table public.children add constraint child_interests_length check(length(array_to_string(interests,',')) <= 1220);
alter table public.child_invites add constraint invite_relationship_length check(length(trim(relationship)) between 1 and 60);
revoke update on public.notification_preferences from authenticated;
grant update(show_child_name,quiet_start,quiet_end,timezone) on public.notification_preferences to authenticated;
alter table public.milestone_catalog add constraint approved_copy_vocabulary check (
  clinical_review_status <> 'approved' or
  concat_ws(' ',title,prompt_question,reassurance_copy,consult_copy) !~* '\m(delay|delayed|abnormal|behind|should[[:space:]]+have|worry)\M'
);
