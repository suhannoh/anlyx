package com.anlyx.sample.benefit;

import org.springframework.stereotype.Service;

@Service
class PublicBenefitService {
  private final BenefitRepository benefitRepository;
  private final BenefitDisplayMapper benefitDisplayMapper;
  private final DateRangeUtil dateRangeUtil;
  private final PublicVisibilityPolicy publicVisibilityPolicy;

  public BenefitSummaryListResponse listBenefits() {
    benefitRepository.findAll();
    return new BenefitSummaryListResponse();
  }

  public BenefitDetailResponse getBenefitDetail(Long id) {
    benefitDisplayMapper.toDetail();
    dateRangeUtil.isActive();
    publicVisibilityPolicy.canShow();
    benefitRepository.findById(id);
    return new BenefitDetailResponse();
  }
}
