-- PostgreSQL constraint checks, synthetic data only. Entire fixture transaction is rolled back.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO app_users(id,email,password_hash,display_name,friend_code) VALUES
('00000000-0000-4000-8000-000000000001','one@example.test','test-only-hash','One','QR_ONE'),
('00000000-0000-4000-8000-000000000002','two@example.test','test-only-hash','Two','QR_TWO'),
('00000000-0000-4000-8000-000000000003','three@example.test','test-only-hash','Three','QR_THREE');
INSERT INTO cities(code,name) VALUES ('TESTCITY','Synthetic city');
INSERT INTO trips(id,owner_id,city_code,title,start_date,end_date) VALUES
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','TESTCITY','Trip A','2026-10-01','2026-10-02'),
('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000002','TESTCITY','Trip B','2026-10-01','2026-10-01');
INSERT INTO trip_members(trip_id,user_id) VALUES ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000001');
INSERT INTO itineraries(trip_id,updated_by) VALUES ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000002');
INSERT INTO itinerary_days(id,trip_id,day_number) VALUES ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000101',1),('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000101',2),('00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000102',1);
INSERT INTO places(id,provider_place_id) VALUES ('00000000-0000-4000-8000-000000000201','synthetic-place-1');
INSERT INTO itinerary_items(id,day_id,place_id,kind,position,start_time,end_time,created_by,updated_by) VALUES
('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000201','PLACE',0,'09:00','10:00','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001'),
('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000201','PLACE',1,'11:00','12:00','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
INSERT INTO media_assets(id,uploader_id,trip_id,purpose,status,object_key,original_filename,mime_type,size_bytes,reserved_bytes) VALUES
('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','CHAT','READY','test/a','a.jpg','image/jpeg',100,100),
('00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000102','CHAT','READY','test/b','b.jpg','image/jpeg',100,100),
('00000000-0000-4000-8000-000000000503','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000101','CHAT','READY','test/c','c.jpg','image/jpeg',100,100);
INSERT INTO chat_messages(id,trip_id,sender_id,seq,client_message_id,request_hash,kind,body) VALUES
('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001',1,'00000000-0000-4000-8000-000000000601',repeat('a',64),'TEXT','Hello');
INSERT INTO chat_messages(id,trip_id,sender_id,seq,client_message_id,request_hash,kind,media_id) VALUES
('00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001',2,'00000000-0000-4000-8000-000000000602',repeat('b',64),'IMAGE','00000000-0000-4000-8000-000000000501');
SET CONSTRAINTS ALL IMMEDIATE;
DO $test$ BEGIN
 BEGIN
  INSERT INTO friend_requests(id,sender_id,recipient_id) VALUES ('00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'FAIL: self friend request was accepted';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS: self friend request';
 END;
END $test$;

INSERT INTO friend_requests(id,sender_id,recipient_id) VALUES ('00000000-0000-4000-8000-000000000802','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');

DO $test$ BEGIN
 BEGIN
  INSERT INTO friend_requests(id,sender_id,recipient_id) VALUES ('00000000-0000-4000-8000-000000000803','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'FAIL: opposite pending friend request was accepted';
 EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'PASS: opposite pending friend request';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  INSERT INTO friendships(user_low_id,user_high_id) VALUES ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'FAIL: friend pair order was accepted';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS: friend pair order';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  UPDATE trips SET end_date='2026-10-06' WHERE id='00000000-0000-4000-8000-000000000101';
  RAISE EXCEPTION 'FAIL: trip longer than five days was accepted';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS: trip longer than five days';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  UPDATE trips SET budget_vnd=-1 WHERE id='00000000-0000-4000-8000-000000000101';
  RAISE EXCEPTION 'FAIL: negative budget was accepted';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS: negative budget';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  INSERT INTO trips(id,owner_id,city_code,title,start_date,end_date) VALUES ('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000003','TESTCITY','No owner membership','2026-10-01','2026-10-01');
  RAISE EXCEPTION 'FAIL: missing owner membership was accepted';
 EXCEPTION WHEN foreign_key_violation THEN
  RAISE NOTICE 'PASS: missing owner membership';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  INSERT INTO itinerary_days(id,trip_id,day_number) VALUES ('00000000-0000-4000-8000-000000000304','00000000-0000-4000-8000-000000000101',1);
  RAISE EXCEPTION 'FAIL: duplicate itinerary day was accepted';
 EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'PASS: duplicate itinerary day';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  UPDATE itinerary_items SET end_time='08:00' WHERE id='00000000-0000-4000-8000-000000000401';
  RAISE EXCEPTION 'FAIL: reversed item time was accepted';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS: reversed item time';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  UPDATE itinerary_items SET estimated_cost_vnd=100 WHERE id='00000000-0000-4000-8000-000000000401';
  RAISE EXCEPTION 'FAIL: unknown cost with amount was accepted';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS: unknown cost with amount';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  INSERT INTO chat_messages(id,trip_id,sender_id,seq,client_message_id,request_hash,kind,body) VALUES ('00000000-0000-4000-8000-000000000703','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001',3,'00000000-0000-4000-8000-000000000601',repeat('c',64),'TEXT','Retry');
  RAISE EXCEPTION 'FAIL: repeated client message id was accepted';
 EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'PASS: repeated client message id';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  INSERT INTO chat_messages(id,trip_id,sender_id,seq,client_message_id,request_hash,kind,media_id,body) VALUES ('00000000-0000-4000-8000-000000000704','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001',4,'00000000-0000-4000-8000-000000000604',repeat('d',64),'IMAGE','00000000-0000-4000-8000-000000000502',NULL);
  RAISE EXCEPTION 'FAIL: media from another trip was accepted';
 EXCEPTION WHEN foreign_key_violation THEN
  RAISE NOTICE 'PASS: media from another trip';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  INSERT INTO chat_messages(id,trip_id,sender_id,seq,client_message_id,request_hash,kind,media_id,body) VALUES ('00000000-0000-4000-8000-000000000704','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001',4,'00000000-0000-4000-8000-000000000604',repeat('d',64),'IMAGE','00000000-0000-4000-8000-000000000503',NULL);
  RAISE EXCEPTION 'FAIL: media from another uploader was accepted';
 EXCEPTION WHEN foreign_key_violation THEN
  RAISE NOTICE 'PASS: media from another uploader';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  INSERT INTO chat_messages(id,trip_id,sender_id,seq,client_message_id,request_hash,kind,media_id,body) VALUES ('00000000-0000-4000-8000-000000000704','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001',4,'00000000-0000-4000-8000-000000000604',repeat('d',64),'IMAGE','00000000-0000-4000-8000-000000000501',NULL);
  RAISE EXCEPTION 'FAIL: attachment reused in second message was accepted';
 EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'PASS: attachment reused in second message';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  INSERT INTO chat_messages(id,trip_id,sender_id,seq,client_message_id,request_hash,kind,media_id,body) VALUES ('00000000-0000-4000-8000-000000000704','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001',4,'00000000-0000-4000-8000-000000000604',repeat('d',64),'IMAGE',NULL,NULL);
  RAISE EXCEPTION 'FAIL: image message without file was accepted';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS: image message without file';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  INSERT INTO chat_messages(id,trip_id,sender_id,seq,client_message_id,request_hash,kind,media_id,body) VALUES ('00000000-0000-4000-8000-000000000704','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001',4,'00000000-0000-4000-8000-000000000604',repeat('d',64),'TEXT',NULL,'  ');
  RAISE EXCEPTION 'FAIL: empty text message was accepted';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS: empty text message';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  UPDATE app_users SET avatar_media_id='00000000-0000-4000-8000-000000000501' WHERE id='00000000-0000-4000-8000-000000000002';
  RAISE EXCEPTION 'FAIL: avatar belonging to another user was accepted';
 EXCEPTION WHEN foreign_key_violation THEN
  RAISE NOTICE 'PASS: avatar belonging to another user';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  INSERT INTO media_assets(id,uploader_id,purpose,object_key,original_filename,mime_type,size_bytes,reserved_bytes) VALUES ('00000000-0000-4000-8000-000000000504','00000000-0000-4000-8000-000000000001','AVATAR','test/pdf','a.pdf','application/pdf',100,100);
  RAISE EXCEPTION 'FAIL: PDF as avatar was accepted';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS: PDF as avatar';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  UPDATE media_assets SET reserved_bytes=0 WHERE id='00000000-0000-4000-8000-000000000501';
  RAISE EXCEPTION 'FAIL: premature quota release was accepted';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS: premature quota release';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  INSERT INTO outbox_events(id,dedup_key,event_type,aggregate_id,payload,status) VALUES ('00000000-0000-4000-8000-000000000901','test-event','CHAT_CREATED','00000000-0000-4000-8000-000000000701','{}','PROCESSING');
  RAISE EXCEPTION 'FAIL: processing without lease was accepted';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS: processing without lease';
 END;
END $test$;

DO $test$ BEGIN
 BEGIN
  INSERT INTO notifications(id,event_key,recipient_id,actor_id,type,friend_request_id,title,body) VALUES ('00000000-0000-4000-8000-000000000902','test-notification','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','FRIEND_REQUEST','00000000-0000-4000-8000-000000000802','Test','Test');
  RAISE EXCEPTION 'FAIL: notification for actor was accepted';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS: notification for actor';
 END;
END $test$;

SET CONSTRAINTS uq_item_position DEFERRED;
UPDATE itinerary_items SET position=1 WHERE id='00000000-0000-4000-8000-000000000401';
UPDATE itinerary_items SET position=0 WHERE id='00000000-0000-4000-8000-000000000402';
SET CONSTRAINTS uq_item_position IMMEDIATE;
DO $test$ BEGIN
 IF (SELECT position FROM itinerary_items WHERE id='00000000-0000-4000-8000-000000000401') <> 1 OR (SELECT position FROM itinerary_items WHERE id='00000000-0000-4000-8000-000000000402') <> 0 THEN
  RAISE EXCEPTION 'FAIL: deferred reorder';
 END IF;
 RAISE NOTICE 'PASS: deferred reorder';
END $test$;

UPDATE friend_requests SET status='REJECTED',resolved_at=now() WHERE id='00000000-0000-4000-8000-000000000802';
INSERT INTO friend_requests(id,sender_id,recipient_id) VALUES ('00000000-0000-4000-8000-000000000804','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');
DO $test$ BEGIN RAISE NOTICE 'PASS: new request after rejection'; END $test$;
ROLLBACK;
SELECT count(*) AS table_count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';
SELECT count(*) AS foreign_key_count FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace;
