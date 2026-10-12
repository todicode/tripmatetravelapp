package com.tripmate.trips.application;

import com.tripmate.shared.persistence.SignedCursor;
import com.tripmate.shared.security.AuthenticatedActor;
import com.tripmate.shared.web.ApiException;
import com.tripmate.trips.infrastructure.TripRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static com.tripmate.trips.application.TripModels.*;
import static com.tripmate.trips.application.TripRules.*;

@Service
@Transactional
public class TripService {
    private final TripRepository trips;
    private final SignedCursor cursors;
    public TripService(TripRepository trips,@org.springframework.beans.factory.annotation.Qualifier("signedCursor") SignedCursor cursors) {this.trips=trips;this.cursors=cursors;}
    public UUID actor() {
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        if(authentication==null||!(authentication.getPrincipal() instanceof AuthenticatedActor user))
            throw new ApiException(HttpStatus.UNAUTHORIZED,"UNAUTHORIZED","Cần đăng nhập.");
        return user.userId();
    }
    public List<City> cities() {actor();return trips.cities();}
    private Trip require(UUID id,boolean lock) {return trips.find(id,actor(),lock).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"TRIP_NOT_FOUND","Không tìm thấy chuyến đi."));}
    private void owner(Trip t) {if(!t.ownerId().equals(actor())) throw new ApiException(HttpStatus.FORBIDDEN,"OWNER_REQUIRED","Chỉ chủ chuyến được thực hiện.");}
    private void editable(Trip t) {if(t.status().equals("CANCELLED")) throw conflict("TRIP_CANCELLED","Khôi phục chuyến trước khi chỉnh sửa.");}
    public Trip get(UUID id) {return require(id,false);}
    public Itinerary itinerary(UUID id) {return trips.itinerary(require(id,true));}
    public Page list(String cursor,int limit) {
        UUID actor=actor();if(limit<1||limit>100) throw invalid("limit từ 1 đến 100.");
        var position=cursor==null?null:cursors.decode("trips",cursor,actor,limit);
        var ids=trips.list(actor,position==null?null:position.time(),position==null?null:position.id(),limit+1);
        boolean more=ids.size()>limit;var selected=ids.subList(0,Math.min(ids.size(),limit));
        var values=selected.stream().map(this::get).toList();var tail=values.isEmpty()?null:values.getLast();
        return new Page(values,new PageInfo(more?cursors.encode("trips",actor,limit,tail.createdAt(),tail.id()):null,more));
    }
    public Trip create(Create body) {
        UUID actor=actor();String serialized=trips.serialize(body);
        trips.lockCreate(actor,body.clientRequestId());
        var receipt=trips.receipt(actor,body.clientRequestId(),serialized);
        if(receipt.isPresent()) {
            if(!receipt.get().matches()) throw conflict("IDEMPOTENCY_CONFLICT","Khóa tạo chuyến đã dùng với nội dung khác.");
            return get(receipt.get().tripId());
        }
        text(body.title(),160);schedule(body.dateMode(),body.durationDays(),body.startDate(),body.endDate());
        if(body.startDate()!=null&&body.startDate().isBefore(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")))) throw invalid("Ngày đi không được ở quá khứ.");
        number(body.budgetVnd());city(body.cityCode());days(body.days(),body.durationDays());
        if(body.days().stream().allMatch(d->d.items().isEmpty())) throw invalid("Cần ít nhất một điểm dừng.");
        validateItems(body.days(),Set.of());
        UUID id=UUID.randomUUID();trips.create(id,actor,body);
        trips.writeDays(id,actor,body.days(),trips.itinerary(get(id)));
        trips.remember(actor,body.clientRequestId(),id,serialized);
        return get(id);
    }
    private void city(String code) {if(!trips.cityExists(code)) throw invalid("Điểm đến chưa được hỗ trợ.");}
    private void validateItems(List<DayInput> days,Set<UUID> owned) {
        for(var day:days) for(var item:day.items()) {
            if(item.id()!=null&&!owned.contains(item.id())) throw invalid("Điểm dừng không thuộc lịch này.");
            if(item.placeId()!=null&&trips.place(item.placeId()).isEmpty()) throw invalid("Địa điểm không tồn tại.");
        }
    }
    public Itinerary replace(UUID id,Replace body) {
        Trip trip=require(id,true);editable(trip);version(body.expectedVersion(),trip.itineraryVersion());days(body.days(),trip.durationDays());
        var old=trips.itinerary(trip);Set<UUID> owned=new HashSet<>();old.days().forEach(d->d.items().forEach(i->owned.add(i.id())));
        validateItems(body.days(),owned);trips.writeDays(id,actor(),body.days(),old);
        trips.bumpItinerary(id,actor());trips.recomputeStatus(id);return trips.itinerary(get(id));
    }
    public Itinerary progress(UUID id,UUID item,Progress body) {
        Trip trip=require(id,true);editable(trip);version(body.expectedVersion(),trip.itineraryVersion());
        if(!Set.of("PENDING","ACTIVE","COMPLETED").contains(body.status())) throw invalid("Tiến độ không hợp lệ.");
        if(trips.itinerary(trip).days().stream().flatMap(d->d.items().stream()).noneMatch(i->i.id().equals(item))) throw new ApiException(HttpStatus.NOT_FOUND,"ITEM_NOT_FOUND","Không tìm thấy điểm dừng.");
        trips.progress(id,item,body.status(),actor());trips.bumpItinerary(id,actor());trips.recomputeStatus(id);return trips.itinerary(get(id));
    }
    public Trip update(UUID id,Map<String,Object> body) {
        if(!Set.of("expectedTripVersion","title","description","cityCode","dateMode","durationDays","startDate","endDate","budgetVnd","status").containsAll(body.keySet())||body.size()<2) throw invalid("Thuộc tính không được hỗ trợ.");
        Trip old=require(id,true);owner(old);version(text(body.get("expectedTripVersion"),19),old.version());
        String status=body.containsKey("status")?text(body.get("status"),16):old.status();
        if(!Set.of("UPCOMING","CANCELLED").contains(status)&&!(status.equals(old.status())&&!body.containsKey("status"))) throw invalid("Chỉ hủy hoặc khôi phục; hoàn thành dựa trên tiến độ.");
        if(old.status().equals("CANCELLED")&&(!status.equals("UPCOMING")||body.size()!=2)) throw conflict("TRIP_CANCELLED","Khôi phục chuyến trước khi sửa.");
        String mode=body.containsKey("dateMode")?text(body.get("dateMode"),16):old.dateMode();
        int count=old.durationDays();if(body.containsKey("durationDays")) {if(!(body.get("durationDays") instanceof Integer n)) throw invalid("Số ngày phải là số nguyên.");count=n;}
        LocalDate start=date(body,"startDate",old.startDate()),end=date(body,"endDate",old.endDate());schedule(mode,count,start,end);
        String city=body.containsKey("cityCode")?text(body.get("cityCode"),32):old.city().code();city(city);
        if(!city.equals(old.city().code())&&trips.hasItemsAfter(id,0)) throw conflict("CITY_HAS_PLACES","Xóa điểm dừng trước khi đổi điểm đến.");
        if(trips.hasItemsAfter(id,count)) throw conflict("DAYS_NOT_EMPTY","Ngày bị bỏ còn điểm dừng.");
        String budget=nullable(body,"budgetVnd",old.budgetVnd(),19);number(budget);
        Trip changed=new Trip(id,old.ownerId(),body.containsKey("title")?text(body.get("title"),160):old.title(),nullable(body,"description",old.description(),2000),new City(city,"","VN",old.timezone(),null,null,null),mode,count,start,end,budget,old.timezone(),status,old.phase(),old.version(),old.itineraryVersion(),old.lastChatSeq(),old.memberCount(),old.myRole(),old.createdAt(),old.updatedAt());
        trips.update(changed);
        if(!Objects.equals(start,old.startDate())||!Objects.equals(end,old.endDate())||count!=old.durationDays()||!mode.equals(old.dateMode())) {trips.resize(id,count);trips.bumpItinerary(id,actor());}
        if(body.containsKey("status")&&status.equals("UPCOMING")) trips.recomputeStatus(id);
        return get(id);
    }
    private LocalDate date(Map<String,Object> body,String key,LocalDate fallback) {
        if(!body.containsKey(key)) return fallback;if(body.get(key)==null) return null;
        try {return LocalDate.parse(text(body.get(key),10));} catch(java.time.format.DateTimeParseException e) {throw invalid("Ngày không hợp lệ.");}
    }
    private String nullable(Map<String,Object> body,String key,String fallback,int max) {
        if(!body.containsKey(key)) return fallback;if(body.get(key)==null) return null;
        if(!(body.get(key) instanceof String s)||s.codePointCount(0,s.length())>max) throw invalid(key+" không hợp lệ.");return s;
    }
    public void delete(UUID id,String expected) {var trip=require(id,true);owner(trip);version(expected,trip.version());trips.delete(id);}
}
