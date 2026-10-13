CREATE TABLE interests (
 code varchar(32) PRIMARY KEY,
 label varchar(80) NOT NULL
);
CREATE TABLE user_interests (
 user_id uuid NOT NULL REFERENCES app_users(id),
 interest_code varchar(32) NOT NULL REFERENCES interests(code),
 PRIMARY KEY (user_id, interest_code)
);
INSERT INTO interests(code,label) VALUES
 ('FOOD','Ẩm thực'), ('NATURE','Thiên nhiên'), ('CULTURE','Văn hóa'),
 ('HIGHLIGHTS','Nổi bật'), ('MUSEUMS','Bảo tàng'), ('HISTORY','Lịch sử'), ('SHOPPING','Mua sắm');
