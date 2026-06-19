package com.anlyx.sample.benefit;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/benefits")
class PublicBenefitController {
  private final PublicBenefitService publicBenefitService;

  @GetMapping("")
  public BenefitSummaryListResponse list() {
    return publicBenefitService.listBenefits();
  }

  @GetMapping("/{id}")
  public BenefitDetailResponse getDetail(@PathVariable Long id) {
    return publicBenefitService.getBenefitDetail(id);
  }
}
