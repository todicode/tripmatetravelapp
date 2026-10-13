package com.tripmate.trips.application;

import com.tripmate.shared.web.*;
import org.springframework.http.HttpStatus;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import static com.tripmate.trips.application.TripModels.*;

public final class TripRules {
    private TripRules() {}
    public static ApiException invalid(String message) { return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"VALIDATION_ERROR",message); }
    public static ApiException conflict(String code,String message) { return new ApiException(HttpStatus.CONFLICT,code,message); }
    public static String text(Object value,int max) {
        if (!(value instanceof String s) || s.isBlank() || s.codePointCount(0,s.length())>max) throw invalid("Chuỗi không hợp lệ.");
        return s.trim();
    }
    public static Long number(Object input) {
        if(input==null) return null;
        if(!(input instanceof String value)) throw invalid("Số nguyên phải là chuỗi thập phân không âm.");
        try { if(!value.matches("0|[1-9][0-9]{0,18}")) throw new IllegalArgumentException(); return Long.parseLong(value); }
        catch(IllegalArgumentException e) { throw invalid("Số nguyên phải là chuỗi thập phân không âm."); }
    }
    public static void version(Object expected,String actual) {
        if(expected==null) throw invalid("Thiếu version."); number(expected);
        if(!expected.equals(actual)) throw new ApiException(HttpStatus.CONFLICT,"VERSION_CONFLICT","Dữ liệu đã thay đổi. Tải lại trước khi lưu.",List.of(),Map.of("currentVersion",actual));
    }
    public static void schedule(String mode,int count,LocalDate start,LocalDate end) {
        if(count<1||count>30) throw invalid("Chuyến đi phải từ 1 đến 30 ngày.");
        if("FLEXIBLE".equals(mode)) { if(start!=null||end!=null) throw invalid("Ngày linh hoạt phải để trống ngày đi/về."); }
        else if(!"SPECIFIC".equals(mode)||start==null||end==null||ChronoUnit.DAYS.between(start,end)+1!=count)
            throw invalid("Ngày đi/về không khớp số ngày.");
    }
    public static LocalTime time(String value) {
        if(value==null) return null;
        if(!value.matches("([01][0-9]|2[0-3]):[0-5][0-9]")) throw invalid("Giờ phải theo HH:mm.");
        return LocalTime.parse(value);
    }
    public static void days(List<DayInput> days,int count) {
        if(days==null||days.size()!=count) throw invalid("Lịch phải đủ số ngày của chuyến.");
        Set<UUID> ids=new HashSet<>();
        for(int index=0;index<count;index++) {
            var day=days.get(index);
            if(day==null||day.dayNumber()!=index+1||!Set.of("WALK","DRIVE").contains(day.transportMode())||day.items()==null||day.items().size()>50)
                throw invalid("Ngày lịch hoặc số điểm dừng không hợp lệ.");
            for(var item:day.items()) {
                if(item==null) throw invalid("Điểm dừng không hợp lệ.");
                if(item.id()!=null&&!ids.add(item.id())) throw invalid("ID điểm dừng bị lặp.");
                var start=time(item.startTime());var end=time(item.endTime());
                if(start!=null&&end!=null&&!end.isAfter(start)) throw invalid("Giờ kết thúc phải sau giờ đến.");
                number(item.estimatedCostVnd());
                if("NOTE".equals(item.kind())) {text(item.customTitle(),160);if(item.placeId()!=null||item.placeSnapshot()!=null) throw invalid("Ghi chú không chứa địa điểm.");}
                else if("PLACE".equals(item.kind())) {
                    if(item.placeId()==null&&item.placeSnapshot()==null) throw invalid("Thiếu địa điểm.");
                    if(item.placeId()!=null&&item.placeSnapshot()!=null) throw invalid("Chỉ gửi placeId hoặc snapshot.");
                } else throw invalid("Loại điểm dừng không hợp lệ.");
                if(item.placeSnapshot()!=null) snapshot(item.placeSnapshot());
            }
        }
    }
    public static void snapshot(Snapshot place) {
        text(place.name(),160);
        if(place.provider()==null||!Set.of("OSM","MANUAL","CATALOG").contains(place.provider())) throw invalid("Nguồn địa điểm không hợp lệ.");
        if("OSM".equals(place.provider())) text(place.providerPlaceId(),200);
        if((place.lat()==null)!=(place.lng()==null)||place.lat()!=null&&(!Double.isFinite(place.lat())||!Double.isFinite(place.lng())||Math.abs(place.lat())>90||Math.abs(place.lng())>180))
            throw invalid("Tọa độ không hợp lệ.");
    }
}
